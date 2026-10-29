import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { MAAS_YILLARI } from '../../data/params/maas';
import { todayIsoTR } from '../../lib/finance';
import { formatNumber, formatPercent, formatTL, monthName } from '../../lib/format';
import { NumberField, Segmented, SelectField } from '../../ui/fields';
import {
  Breakdown,
  Callout,
  DataTable,
  Details,
  ResultEmpty,
  ResultHero,
  StatGrid,
  type BreakdownRow,
} from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { enumParam, numParam, readParams } from '../../ui/url';
import {
  AZAMI_HAFTALIK,
  FAZLA_CALISMA_KATSAYI,
  FAZLA_SURELER_KATSAYI,
  VARSAYILAN_BOLEN,
  YILLIK_SINIR,
  hesaplaFazlaMesai,
  saatlikUcret,
  tekrarlananAylar,
  validateBolen,
  validateDonem,
  validateHaftalik,
  validateUcret,
  type UcretTuru,
} from './calc';

const YILLAR = MAAS_YILLARI.map(String);
const AY_SECENEKLERI = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i) }));
const saat = (n: number) => `${formatNumber(n, 2)} saat`;

interface Satir {
  id: number;
  ay: number;
  fazlaCalisma: number | null;
  fazlaSureler: number | null;
  haftaTatili: number | null;
  genelTatil: number | null;
}

export default function Calculator() {
  const sayac = useRef(1);
  const yeniSatir = (ay: number, fc: number | null = 0, fs: number | null = 0, ht: number | null = 0, gt: number | null = 0): Satir => ({
    id: sayac.current++,
    ay,
    fazlaCalisma: fc,
    fazlaSureler: fs,
    haftaTatili: ht,
    genelTatil: gt,
  });

  const [tur, setTur] = useState<UcretTuru>('aylik');
  const [ucret, setUcret] = useState<number | null>(50000);
  const [haftalik, setHaftalik] = useState<number | null>(45);
  const [bolen, setBolen] = useState<number | null>(VARSAYILAN_BOLEN);
  const [yil, setYil] = useState<string>(YILLAR[YILLAR.length - 1]);
  const [satirlar, setSatirlar] = useState<Satir[]>(() => [yeniSatir(10, 10)]);

  useEffect(() => {
    const bugun = todayIsoTR();
    if (YILLAR.includes(bugun.slice(0, 4))) setYil(bugun.slice(0, 4));
    const buAy = Number(bugun.slice(5, 7));

    // ?tur=aylik&ucret=50000&hafta=45&bolen=225&yil=2026&d=10:10:0:0:0,11:5:0:8:1
    const p = readParams();
    const t = enumParam(p, 'tur', ['aylik', 'gunluk', 'saatlik'] as const);
    if (t) setTur(t);
    const u = numParam(p, 'ucret');
    if (u !== null && u > 0) setUcret(u);
    const h = numParam(p, 'hafta');
    if (h !== null && h > 0) setHaftalik(h);
    const b = numParam(p, 'bolen');
    if (b !== null && b > 0) setBolen(b);
    const y = numParam(p, 'yil');
    if (y !== null && YILLAR.includes(String(y))) setYil(String(y));
    const d = p.get('d');
    const list = d
      ? d
          .split(',')
          .map((s) => s.split(':').map(Number))
          .filter((x) => x.length === 5 && x.every(Number.isFinite) && x[0] >= 1 && x[0] <= 12)
          .slice(0, 12)
          .map(([ay, fc, fs, ht, gt]) => yeniSatir(ay, fc, fs, ht, gt))
      : [];
    if (list.length > 0) setSatirlar(list);
    else setSatirlar((s) => (s.length === 1 ? [{ ...s[0], ay: buAy }] : s));
  }, []);

  const guncelle = (id: number, patch: Partial<Satir>) =>
    setSatirlar((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const sil = (id: number) => setSatirlar((list) => (list.length > 1 ? list.filter((s) => s.id !== id) : list));
  const ekle = () =>
    setSatirlar((list) => {
      if (list.length >= 12) return list;
      const kullanilan = new Set(list.map((s) => s.ay));
      const son = list[list.length - 1].ay;
      let ay = son;
      for (let i = 1; i <= 12; i++) {
        const aday = ((son - 1 + i) % 12) + 1;
        if (!kullanilan.has(aday)) {
          ay = aday;
          break;
        }
      }
      return [...list, yeniSatir(ay)];
    });

  const fazlaSurelerVar = (haftalik ?? AZAMI_HAFTALIK) < AZAMI_HAFTALIK;
  const ucretHata = validateUcret(ucret);
  const haftalikHata = validateHaftalik(haftalik);
  const bolenHata = tur === 'aylik' ? validateBolen(bolen) : undefined;
  const tekrar = tekrarlananAylar(satirlar.map((s) => s.ay));
  const satirHatalari = satirlar.map((s, i) => {
    // Fazla sürelerle alanı gizliyken (haftalık 45 saat) eski değeri hata saymayalım
    const e = validateDonem({ ...s, fazlaSureler: fazlaSurelerVar ? s.fazlaSureler : 0 }, haftalik);
    if (tekrar.has(i)) e.ay = 'Bu ay başka satırda da seçili.';
    return e;
  });
  const gecerli = !ucretHata && !haftalikHata && !bolenHata && satirHatalari.every((e) => Object.keys(e).length === 0);

  const sonuc = useMemo(
    () =>
      gecerli
        ? hesaplaFazlaMesai({
            yil: Number(yil),
            ucret: { tur, tutar: ucret!, bolen: bolen ?? VARSAYILAN_BOLEN },
            haftalikSure: haftalik!,
            donemler: [...satirlar]
              .sort((a, b) => a.ay - b.ay)
              .map((s) => ({
                ay: s.ay,
                fazlaCalisma: s.fazlaCalisma ?? 0,
                fazlaSureler: fazlaSurelerVar ? (s.fazlaSureler ?? 0) : 0,
                haftaTatili: s.haftaTatili ?? 0,
                genelTatil: s.genelTatil ?? 0,
              })),
          })
        : null,
    [gecerli, yil, tur, ucret, bolen, haftalik, satirlar, fazlaSurelerVar],
  );

  const saatlikOnizleme =
    !ucretHata && !bolenHata ? saatlikUcret({ tur, tutar: ucret!, bolen: bolen ?? VARSAYILAN_BOLEN }) : null;

  const brutSatirlari: BreakdownRow[] = sonuc
    ? [
        ...(sonuc.toplam.fazlaCalisma > 0
          ? [
              {
                label: `Fazla çalışma: ${saat(sonuc.toplam.fazlaCalisma)} × ${formatTL(sonuc.saatlik * FAZLA_CALISMA_KATSAYI)}`,
                value: formatTL(sonuc.toplam.fazlaCalismaUcreti),
                hint: 'Saat ücreti %50 zamlı (4857 md. 41)',
              },
            ]
          : []),
        ...(sonuc.toplam.fazlaSureler > 0
          ? [
              {
                label: `Fazla sürelerle çalışma: ${saat(sonuc.toplam.fazlaSureler)} × ${formatTL(sonuc.saatlik * FAZLA_SURELER_KATSAYI)}`,
                value: formatTL(sonuc.toplam.fazlaSurelerUcreti),
                hint: 'Sözleşme süresi ile 45 saat arası, %25 zamlı',
              },
            ]
          : []),
        ...(sonuc.toplam.haftaTatili > 0
          ? [
              {
                label: `Hafta tatili çalışması: ${saat(sonuc.toplam.haftaTatili)} × ${formatTL(sonuc.saatlik * FAZLA_CALISMA_KATSAYI)}`,
                value: formatTL(sonuc.toplam.haftaTatiliUcreti),
                hint: 'Fazla çalışma sayılır, %50 zamlı; tatil günü ücreti maaşa dahildir',
              },
            ]
          : []),
        ...(sonuc.toplam.genelTatil > 0
          ? [
              {
                label: `Bayram/genel tatil: ${formatNumber(sonuc.toplam.genelTatil, 1)} gün × ${formatTL(sonuc.gunluk)}`,
                value: formatTL(sonuc.toplam.genelTatilUcreti),
                hint: 'Çalışılan her gün için ayrıca bir günlük ücret (4857 md. 47)',
              },
            ]
          : []),
        { label: 'Brüt fazla mesai ücreti', value: formatTL(sonuc.toplam.brut), kind: 'total' },
      ]
    : [];

  const sonDilim = sonuc ? Math.max(...sonuc.donemler.map((d) => d.dilim)) : 0;
  const netSatirlari: BreakdownRow[] = sonuc
    ? [
        { label: 'Brüt fazla mesai ücreti', value: formatTL(sonuc.toplam.brut) },
        { label: 'SGK işçi payı (%14)', value: formatTL(sonuc.toplam.sgkIsci), kind: 'minus' },
        { label: 'İşsizlik sigortası işçi payı (%1)', value: formatTL(sonuc.toplam.issizlikIsci), kind: 'minus' },
        {
          label: 'Gelir vergisi',
          value: formatTL(sonuc.toplam.gv),
          kind: 'minus',
          hint: `Yıl içi kümülatif matrahınıza göre; dilim ${formatPercent(sonDilim)}`,
        },
        { label: 'Damga vergisi (binde 7,59)', value: formatTL(sonuc.toplam.dv), kind: 'minus' },
        { label: 'Bordronuza yansıyan yaklaşık net', value: formatTL(sonuc.toplam.net), kind: 'total' },
        ...(sonuc.dilimEtkisi < 0
          ? [
              {
                label: 'Sonraki aylarda dilim etkisi',
                value: formatTL(sonuc.dilimEtkisi),
                kind: 'minus' as const,
                hint: 'Fazla mesai matrahınızı büyüttüğü için yılın kalanında normal maaşınızdan kesilecek ek vergi',
              },
              { label: 'Yıl genelinde net kazanç', value: formatTL(sonuc.yillikNetEtki), kind: 'total' as const },
            ]
          : []),
      ]
    : [];

  const ozet = sonuc
    ? [
        `Saat ücreti: ${formatTL(sonuc.saatlik)} (%50 zamlı ${formatTL(sonuc.saatlik * FAZLA_CALISMA_KATSAYI)})`,
        ...sonuc.donemler.map(
          (d) => `${monthName(d.ay - 1)} ${yil}: brüt ${formatTL(d.brut)}, yaklaşık net ${formatTL(d.net)}`,
        ),
        `Toplam brüt fazla mesai: ${formatTL(sonuc.toplam.brut)}`,
        `Yaklaşık net: ${formatTL(sonuc.toplam.net)}`,
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="fm-tur"
          label="Ücretiniz"
          value={tur}
          onChange={setTur}
          options={[
            { value: 'aylik', label: 'Aylık brüt' },
            { value: 'gunluk', label: 'Günlük brüt' },
            { value: 'saatlik', label: 'Saatlik brüt' },
          ]}
        />
        <NumberField
          id="fm-ucret"
          label={tur === 'aylik' ? 'Aylık brüt ücret' : tur === 'gunluk' ? 'Günlük brüt ücret' : 'Saatlik brüt ücret'}
          value={ucret}
          onChange={setUcret}
          suffix="TL"
          error={ucretHata}
          hint={saatlikOnizleme !== null ? `Saat ücretiniz: ${formatTL(saatlikOnizleme)}` : undefined}
        />
        <div class="row-2">
          <NumberField
            id="fm-haftalik"
            label="Haftalık çalışma süresi"
            value={haftalik}
            onChange={setHaftalik}
            suffix="saat"
            decimals={1}
            error={haftalikHata}
            hint="Sözleşmenizdeki süre (en çok 45)."
          />
          <SelectField
            id="fm-yil"
            label="Vergi yılı"
            value={yil}
            onChange={setYil}
            options={YILLAR.map((y) => ({ value: y, label: y }))}
          />
        </div>

        <div class="field">
          <span class="field__label">Fazla mesai yapılan aylar</span>
          <ul class="line-items">
            {satirlar.map((s, i) => (
              <li class="line-item" key={s.id}>
                <div class="line-item__head">
                  <span>Dönem {i + 1}</span>
                  {satirlar.length > 1 && (
                    <button type="button" class="line-item__remove" onClick={() => sil(s.id)} aria-label={`Dönem ${i + 1}’i sil`}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
                <div class="line-item__fields">
                  <SelectField
                    id={`fm-ay-${s.id}`}
                    label="Ay"
                    value={String(s.ay)}
                    onChange={(v) => guncelle(s.id, { ay: Number(v) })}
                    options={AY_SECENEKLERI}
                    error={satirHatalari[i].ay}
                  />
                  <NumberField
                    id={`fm-fc-${s.id}`}
                    label="Fazla çalışma (%50)"
                    value={s.fazlaCalisma}
                    onChange={(v) => guncelle(s.id, { fazlaCalisma: v })}
                    suffix="saat"
                    error={satirHatalari[i].fazlaCalisma}
                  />
                </div>
                <div class="line-item__fields">
                  <NumberField
                    id={`fm-ht-${s.id}`}
                    label="Hafta tatilinde çalışma"
                    value={s.haftaTatili}
                    onChange={(v) => guncelle(s.id, { haftaTatili: v })}
                    suffix="saat"
                    error={satirHatalari[i].haftaTatili}
                  />
                  <NumberField
                    id={`fm-gt-${s.id}`}
                    label="Bayram / genel tatil"
                    value={s.genelTatil}
                    onChange={(v) => guncelle(s.id, { genelTatil: v })}
                    suffix="gün"
                    decimals={1}
                    error={satirHatalari[i].genelTatil}
                  />
                </div>
                {fazlaSurelerVar && (
                  <NumberField
                    id={`fm-fs-${s.id}`}
                    label={`Fazla sürelerle çalışma (%25, ${formatNumber(haftalik ?? 0, 1)}–45 saat arası)`}
                    value={s.fazlaSureler}
                    onChange={(v) => guncelle(s.id, { fazlaSureler: v })}
                    suffix="saat"
                    error={satirHatalari[i].fazlaSureler}
                  />
                )}
              </li>
            ))}
          </ul>
          {satirlar.length < 12 && (
            <button type="button" class="btn btn--small add-row" onClick={ekle}>
              + Ay ekle
            </button>
          )}
          <p class="field__hint">
            Saatleri o ayın toplamı olarak yazın. Arife günleri (öğleden sonrası tatil) için genel tatile 0,5 gün yazın.
          </p>
        </div>

        {tur === 'aylik' && (
          <Details summary="Gelişmiş: saat ücreti böleni">
            <NumberField
              id="fm-bolen"
              label="Aylık ücretin bölüneceği saat"
              value={bolen}
              onChange={setBolen}
              suffix="saat"
              decimals={1}
              error={bolenHata}
              hint="Yargıtay uygulamasında aylık ücret 225’e bölünür (30 gün × 7,5 saat). Sözleşmeniz başka bir bölen öngörüyorsa değiştirin."
            />
          </Details>
        )}
      </div>

      <div class="calc-results">
        {sonuc ? (
          <>
            <ResultHero
              label="Brüt fazla mesai ücreti"
              value={formatTL(sonuc.toplam.brut)}
              sub={
                <>
                  Yaklaşık net <strong>{formatTL(sonuc.toplam.net)}</strong> · {saat(sonuc.toplam.fazlaCalisma + sonuc.toplam.fazlaSureler + sonuc.toplam.haftaTatili)}
                  {sonuc.toplam.genelTatil > 0 ? ` + ${formatNumber(sonuc.toplam.genelTatil, 1)} tatil günü` : ''}
                </>
              }
            />

            <StatGrid
              items={[
                { label: 'Saat ücreti', value: formatTL(sonuc.saatlik) },
                { label: '%50 zamlı saat', value: formatTL(sonuc.saatlik * FAZLA_CALISMA_KATSAYI) },
                { label: 'Günlük ücret', value: formatTL(sonuc.gunluk) },
                { label: 'Yıllık sınırdan', value: `${formatNumber(sonuc.sinirSaati, 1)} / ${YILLIK_SINIR} saat` },
              ]}
            />

            <Breakdown title="Brüt ücret kalemleri" rows={brutSatirlari} />
            <Breakdown title="Yaklaşık net (kesintiler)" rows={netSatirlari} />

            {sonuc.sinirAsildi && (
              <Callout kind="warning">
                <strong>Yıllık 270 saat sınırı aşıldı.</strong> Girdiğiniz fazla çalışma ve hafta tatili çalışması toplamı{' '}
                {formatNumber(sonuc.sinirSaati, 1)} saat. İş Kanunu md. 41’e göre fazla çalışma yılda 270 saati geçemez;
                yapılmış çalışmanın ücreti ise yine ödenmelidir.
              </Callout>
            )}

            {sonuc.donemler.length > 1 && (
              <DataTable
                caption="Aylara göre döküm"
                columns={[
                  { key: 'ay', label: 'Ay' },
                  { key: 'saat', label: 'Saat' },
                  { key: 'gun', label: 'Tatil günü' },
                  { key: 'brut', label: 'Brüt' },
                  { key: 'net', label: 'Yaklaşık net' },
                ]}
                rows={sonuc.donemler.map((d) => ({
                  ay: monthName(d.ay - 1),
                  saat: formatNumber(d.fazlaCalisma + d.fazlaSureler + d.haftaTatili, 1),
                  gun: formatNumber(d.genelTatil, 1),
                  brut: formatTL(d.brut),
                  net: formatTL(d.net),
                }))}
                foot={{
                  ay: 'Toplam',
                  saat: formatNumber(sonuc.toplam.fazlaCalisma + sonuc.toplam.fazlaSureler + sonuc.toplam.haftaTatili, 1),
                  gun: formatNumber(sonuc.toplam.genelTatil, 1),
                  brut: formatTL(sonuc.toplam.brut),
                  net: formatTL(sonuc.toplam.net),
                }}
              />
            )}

            <Callout kind="info">
              Net tutar <strong>yaklaşıktır</strong>: {yil} yılında her ay aynı ücreti aldığınız varsayılarak, fazla mesainin
              girildiği ayın bordrosu mesaili ve mesaisiz hâliyle karşılaştırıldı (SGK %14, işsizlik %1, kümülatif matraha göre
              gelir vergisi, damga vergisi). İkramiye, prim gibi başka ödemeler sonucu değiştirebilir.
            </Callout>

            <ShareBar
              params={{
                tur,
                ucret,
                hafta: haftalik,
                bolen: tur === 'aylik' && bolen !== VARSAYILAN_BOLEN ? bolen : null,
                yil,
                d: satirlar
                  .map((s) => [s.ay, s.fazlaCalisma ?? 0, fazlaSurelerVar ? (s.fazlaSureler ?? 0) : 0, s.haftaTatili ?? 0, s.genelTatil ?? 0].join(':'))
                  .join(','),
              }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için ücretinizi, haftalık sürenizi ve fazla mesai saatlerinizi girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
