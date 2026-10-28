import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { kdvOranlari, kismiTevkifatSiniri, tevkifatSiniriOn } from '../../data/params/kdv';
import { todayIsoTR } from '../../lib/finance';
import { formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero, type BreakdownRow } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import { hesaplaFatura, validateSatir, type KdvMode } from './calc';

type OranSecim = '20' | '10' | '1' | '0' | 'diger';
const ORAN_SECENEKLERI: { value: OranSecim; label: string }[] = [
  { value: '20', label: '%20 (genel oran)' },
  { value: '10', label: '%10' },
  { value: '1', label: '%1' },
  { value: '0', label: '%0 (istisna / KDV’siz)' },
  { value: 'diger', label: 'Diğer oran…' },
];

type TevkifatSecim = 'yok' | '2' | '3' | '4' | '5' | '7' | '9' | '10';
const TEVKIFAT_SECENEKLERI: { value: TevkifatSecim; label: string }[] = [
  { value: 'yok', label: 'Yok' },
  ...kdvOranlari.values.tevkifatPaylari.map((p) => ({ value: String(p) as TevkifatSecim, label: `${p}/10` })),
];

interface Satir {
  id: number;
  tutar: number | null;
  oranSecim: OranSecim;
  ozelOran: number | null;
  tevkifatli: boolean;
}

const satirOlustur = (id: number, tutar: number | null = null, oran = 20, tevkifatli = true): Satir => {
  const secim = (['20', '10', '1', '0'] as const).find((s) => Number(s) === oran);
  return { id, tutar, oranSecim: secim ?? 'diger', ozelOran: secim ? null : oran, tevkifatli };
};

const oranOf = (s: Satir): number | null => (s.oranSecim === 'diger' ? s.ozelOran : Number(s.oranSecim));

const SINIR_YILLARI = kismiTevkifatSiniri.values.donemler.map((d) => d.from.slice(0, 4));

export default function Calculator() {
  // Satır kimlikleri bileşen başına sayılır; sunucu ve tarayıcı aynı kimliklerle başlar.
  const sayac = useRef(1);
  const yeniSatir = (tutar: number | null = null, oran = 20, tevkifatli = true) =>
    satirOlustur(sayac.current++, tutar, oran, tevkifatli);

  const [satirlar, setSatirlar] = useState<Satir[]>(() => [yeniSatir(1000, 20)]);
  const [mode, setMode] = useState<KdvMode>('haric');
  const [tevkifat, setTevkifat] = useState<TevkifatSecim>('yok');
  const [sinirUygula, setSinirUygula] = useState(true);
  const [yil, setYil] = useState<string>(() => SINIR_YILLARI[SINIR_YILLARI.length - 1]);

  useEffect(() => {
    // Bugünün yılına göre sınır yılı (sayfa sunucuda derlendiği için tarayıcıda belirlenir).
    const buYil = todayIsoTR().slice(0, 4);
    if (SINIR_YILLARI.includes(buYil)) setYil(buYil);

    // Paylaşılan bağlantı: ?s=1000:20,250:10:0&tur=haric&tev=9&sinir=0&yil=2026
    const p = readParams();
    const s = p.get('s');
    if (s) {
      const list = s
        .split(',')
        .map((part) => part.split(':'))
        .filter(([t, o]) => Number.isFinite(Number(t)) && Number.isFinite(Number(o)))
        .slice(0, 50)
        .map(([t, o, f]) => yeniSatir(Number(t), Number(o), f !== '0'));
      if (list.length > 0) setSatirlar(list);
    }
    const m = enumParam(p, 'tur', ['haric', 'dahil'] as const);
    if (m) setMode(m);
    const t = enumParam(p, 'tev', TEVKIFAT_SECENEKLERI.map((x) => x.value));
    if (t) setTevkifat(t);
    if (boolParam(p, 'sinir') === false) setSinirUygula(false);
    const y = numParam(p, 'yil');
    if (y !== null && SINIR_YILLARI.includes(String(y))) setYil(String(y));
  }, []);

  const guncelle = (id: number, patch: Partial<Satir>) =>
    setSatirlar((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const sil = (id: number) => setSatirlar((list) => (list.length > 1 ? list.filter((s) => s.id !== id) : list));
  const ekle = () => setSatirlar((list) => [...list, yeniSatir(null, oranOf(list[list.length - 1]) ?? 20)]);

  const hatalar = satirlar.map((s) => validateSatir(s.tutar, oranOf(s)));
  const gecerli = hatalar.every((h) => !h.tutar && !h.oran);

  const pay = tevkifat === 'yok' ? 0 : Number(tevkifat);
  const kismi = pay > 0 && pay < 10;
  const sinir = tevkifatSiniriOn(`${yil}-06-30`).tutar;
  const cokSatir = satirlar.length > 1;

  const sonuc = useMemo(
    () =>
      gecerli
        ? hesaplaFatura({
            satirlar: satirlar.map((s) => ({ tutar: s.tutar!, oran: oranOf(s)!, tevkifatli: s.tevkifatli })),
            mode,
            tevkifat: pay,
            tevkifatSiniri: kismi && sinirUygula ? sinir : null,
          })
        : null,
    [gecerli, satirlar, mode, pay, kismi, sinirUygula, sinir],
  );

  const oranSatirlari: BreakdownRow[] = sonuc
    ? sonuc.oranlar.map((g) => ({
        label: `KDV ${formatPercent(g.oran)}`,
        hint: `Matrah ${formatTL(g.matrah)}`,
        value: formatTL(g.kdv),
        kind: 'plus' as const,
      }))
    : [];

  const ozet = sonuc
    ? [
        ...sonuc.oranlar.map((g) => `KDV ${formatPercent(g.oran)}: matrah ${formatTL(g.matrah)}, KDV ${formatTL(g.kdv)}`),
        `Toplam matrah: ${formatTL(sonuc.matrah)}`,
        `Toplam KDV: ${formatTL(sonuc.kdv)}`,
        `KDV dahil toplam: ${formatTL(sonuc.toplam)}`,
        ...(sonuc.uygulananTevkifat > 0
          ? [`Tevkifat (${sonuc.uygulananTevkifat}/10): ${formatTL(sonuc.tevkifEdilen)}`, `Alıcının ödeyeceği: ${formatTL(sonuc.odenecekToplam)}`]
          : []),
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="kdv-tur"
          label="Girdiğim tutarlar"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'haric', label: 'KDV hariç' },
            { value: 'dahil', label: 'KDV dahil' },
          ]}
        />

        <div class="field">
          <span class="field__label">Fatura satırları</span>
          <ul class="line-items">
            {satirlar.map((s, i) => (
              <li class="line-item" key={s.id}>
                <div class="line-item__head">
                  <span>Satır {i + 1}</span>
                  {cokSatir && (
                    <button type="button" class="line-item__remove" onClick={() => sil(s.id)} aria-label={`Satır ${i + 1}’i sil`}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
                <div class="line-item__fields">
                  <NumberField
                    id={`kdv-tutar-${s.id}`}
                    label={mode === 'haric' ? 'Tutar (KDV hariç)' : 'Tutar (KDV dahil)'}
                    value={s.tutar}
                    onChange={(v) => guncelle(s.id, { tutar: v })}
                    suffix="TL"
                    placeholder="ör. 1.000"
                    error={hatalar[i].tutar}
                  />
                  <SelectField
                    id={`kdv-oran-${s.id}`}
                    label="KDV oranı"
                    value={s.oranSecim}
                    onChange={(v) => guncelle(s.id, { oranSecim: v })}
                    options={ORAN_SECENEKLERI}
                  />
                </div>
                {s.oranSecim === 'diger' && (
                  <NumberField
                    id={`kdv-ozel-${s.id}`}
                    label="Özel KDV oranı"
                    value={s.ozelOran}
                    onChange={(v) => guncelle(s.id, { ozelOran: v })}
                    suffix="%"
                    error={hatalar[i].oran}
                    hint="Eski tarihli faturalar için %8 veya %18 de yazabilirsiniz."
                  />
                )}
                {pay > 0 && cokSatir && (
                  <CheckboxField
                    id={`kdv-tevkifatli-${s.id}`}
                    label="Bu satır tevkifata tabi"
                    checked={s.tevkifatli}
                    onChange={(v) => guncelle(s.id, { tevkifatli: v })}
                  />
                )}
              </li>
            ))}
          </ul>
          <button type="button" class="btn btn--small add-row" onClick={ekle}>
            + Satır ekle
          </button>
        </div>

        <Segmented
          name="kdv-tevkifat"
          label="KDV tevkifatı"
          value={tevkifat}
          onChange={setTevkifat}
          options={TEVKIFAT_SECENEKLERI}
          hint={
            pay === 0
              ? 'Tevkifatlı faturada alıcı, KDV’nin bir kısmını satıcıya ödemeyip kendisi vergi dairesine yatırır.'
              : 'Hangi işte hangi oranın uygulanacağı KDV Genel Uygulama Tebliği’nde belirlenir; faturanızdaki oranı seçin.'
          }
        />

        {kismi && (
          <>
            <CheckboxField
              id="kdv-sinir"
              label={`Tutar sınırını uygula (KDV dahil ${formatTL(sinir, 0)})`}
              checked={sinirUygula}
              onChange={setSinirUygula}
              hint="Kısmi tevkifat, tevkifata tabi işlemin KDV dahil bedeli bu sınırı aşarsa uygulanır. Aynı iş birden fazla faturaya bölünmüşse toplam bedel esas alınır; toplam sınırı aşıyorsa bu kutuyu kaldırın."
            />
            {sinirUygula && SINIR_YILLARI.length > 1 && (
              <SelectField
                id="kdv-sinir-yil"
                label="Fatura yılı"
                value={yil}
                onChange={setYil}
                options={SINIR_YILLARI.map((y) => ({
                  value: y,
                  label: `${y} (sınır ${formatTL(tevkifatSiniriOn(`${y}-06-30`).tutar, 0)})`,
                }))}
              />
            )}
          </>
        )}
      </div>

      <div class="calc-results">
        {sonuc ? (
          <>
            {mode === 'haric' ? (
              <ResultHero
                label="Fatura toplamı (KDV dahil)"
                value={formatTL(sonuc.toplam)}
                sub={
                  <>
                    {formatTL(sonuc.matrah)} + <strong>{formatTL(sonuc.kdv)}</strong> KDV
                  </>
                }
              />
            ) : (
              <ResultHero
                label="KDV hariç toplam (matrah)"
                value={formatTL(sonuc.matrah)}
                sub={
                  <>
                    {formatTL(sonuc.toplam)} içindeki KDV: <strong>{formatTL(sonuc.kdv)}</strong>
                  </>
                }
              />
            )}

            <Breakdown
              title={sonuc.oranlar.length > 1 ? 'Oranlara göre KDV' : undefined}
              rows={[
                { label: 'KDV hariç toplam (matrah)', value: formatTL(sonuc.matrah) },
                ...oranSatirlari,
                ...(sonuc.oranlar.length > 1 ? [{ label: 'Toplam KDV', value: formatTL(sonuc.kdv) }] : []),
                { label: 'KDV dahil toplam', value: formatTL(sonuc.toplam), kind: 'total' as const },
              ]}
            />

            {sonuc.uygulananTevkifat > 0 && (
              <Breakdown
                title={`Tevkifatlı fatura (${sonuc.uygulananTevkifat}/10)`}
                rows={[
                  {
                    label: 'Alıcının keseceği KDV',
                    value: formatTL(sonuc.tevkifEdilen),
                    kind: 'minus',
                    hint: 'Alıcı bu tutarı KDV-2 beyannamesiyle kendisi öder.',
                  },
                  { label: 'Satıcının tahsil edeceği KDV', value: formatTL(sonuc.tahsilEdilecekKdv) },
                  { label: 'Alıcının satıcıya ödeyeceği', value: formatTL(sonuc.odenecekToplam), kind: 'total' },
                ]}
              />
            )}

            {sonuc.sinirAltinda && (
              <Callout kind="warning">
                <strong>Tevkifat uygulanmaz.</strong> Tevkifata tabi tutar (KDV dahil {formatTL(sonuc.tevkifataTabiToplam)}),{' '}
                {yil} sınırı olan {formatTL(sinir, 0)} tutarını aşmıyor. KDV’nin tamamı satıcıya ödenir.
              </Callout>
            )}

            {cokSatir && (
              <DataTable
                caption="Satır satır döküm"
                columns={[
                  { key: 'no', label: 'Satır' },
                  { key: 'oran', label: 'Oran' },
                  { key: 'matrah', label: 'KDV hariç' },
                  { key: 'kdv', label: 'KDV' },
                  { key: 'toplam', label: 'KDV dahil' },
                ]}
                rows={sonuc.satirlar.map((s, i) => ({
                  no: `${i + 1}${pay > 0 && !s.tevkifatli ? ' (tevkifatsız)' : ''}`,
                  oran: formatPercent(s.oran),
                  matrah: formatTL(s.matrah),
                  kdv: formatTL(s.kdv),
                  toplam: formatTL(s.toplam),
                }))}
                foot={{
                  no: 'Toplam',
                  oran: '',
                  matrah: formatTL(sonuc.matrah),
                  kdv: formatTL(sonuc.kdv),
                  toplam: formatTL(sonuc.toplam),
                }}
              />
            )}

            {mode === 'dahil' && (
              <Callout kind="info">
                KDV dahil tutardan KDV çıkarılırken tutarın %20’si alınmaz; tutar (1 + oran) değerine bölünür. Örneğin
                1.200 TL ÷ 1,20 = 1.000 TL.
              </Callout>
            )}

            <ShareBar
              params={{
                s: satirlar.map((s) => `${s.tutar}:${oranOf(s)}${pay > 0 && !s.tevkifatli ? ':0' : ''}`).join(','),
                tur: mode,
                tev: tevkifat === 'yok' ? null : tevkifat,
                sinir: kismi && !sinirUygula ? false : null,
                yil: kismi ? yil : null,
              }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için her satıra geçerli bir tutar ve oran girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
