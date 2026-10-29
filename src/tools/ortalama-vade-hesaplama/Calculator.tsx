import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { daysBetween, todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatNumber, formatTL } from '../../lib/format';
import { DateField, NumberField, Segmented, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { dateParam, enumParam, numParam, readParams } from '../../ui/url';
import {
  addDaysIso,
  hesaplaOrtalamaVade,
  isValidIsoDate,
  validateBaz,
  validateSatir,
  type GecmisYontemi,
} from './calc';

type VadeTuru = 'tarih' | 'gun';
type GunEsasi = '365' | '360';

interface Satir {
  id: number;
  ad: string;
  tutar: number | null;
  /** ISO vade tarihi (her iki girişte de tutulur) */
  vade: string;
  /** "Gün" girişinde bazdan vadeye gün */
  gun: number | null;
}

const gecmisAciklama: Record<GecmisYontemi, string> = {
  negatif:
    'Vadesi geçmiş satırlar negatif gün olarak hesaba katıldı (ör. 10 gün gecikmiş senet −10 gün). Bu, tek bir ödemeyle bütün borcu kapatacağınız denk tarihi doğru verir.',
  sifir: 'Vadesi geçmiş satırlar bugün ödenecekmiş gibi 0 gün sayıldı; ortalama onları öne çekmez.',
  disla: 'Vadesi geçmiş satırlar ortalamanın dışında bırakıldı; yalnızca vadesi gelmemiş tutarlar hesaba girdi.',
};

export default function Calculator() {
  const sayac = useRef(1);
  const yeniSatir = (tutar: number | null = null, vade = '', gun: number | null = null): Satir => ({
    id: sayac.current++,
    ad: '',
    tutar,
    vade,
    gun,
  });

  const [baz, setBaz] = useState('');
  const [tur, setTur] = useState<VadeTuru>('tarih');
  const [satirlar, setSatirlar] = useState<Satir[]>(() => [yeniSatir(10000, '', 30), yeniSatir(20000, '', 60), yeniSatir(15000, '', 90)]);
  const [gecmis, setGecmis] = useState<GecmisYontemi>('negatif');
  const [faiz, setFaiz] = useState<number | null>(null);
  const [esas, setEsas] = useState<GunEsasi>('365');

  useEffect(() => {
    // Baz tarih varsayılanı bugün (sayfa sunucuda derlendiği için tarayıcıda belirlenir).
    const bugun = todayIsoTR();
    const p = readParams();
    const b = dateParam(p, 'baz') ?? bugun;
    setBaz(b);

    const s = p.get('s');
    const liste = s
      ? s
          .split(',')
          .map((part) => part.split(':'))
          .filter(([t, v]) => Number.isFinite(Number(t)) && isValidIsoDate(v))
          .slice(0, 50)
          .map(([t, v]) => yeniSatir(Number(t), v, daysBetween(b, v)))
      : [];
    if (liste.length > 0) setSatirlar(liste);
    else
      // Varsayılan örnek: bazdan itibaren 30 / 60 / 90 gün
      setSatirlar((list) => list.map((x) => ({ ...x, vade: addDaysIso(b, x.gun ?? 0) })));

    const t = enumParam(p, 'tur', ['tarih', 'gun'] as const);
    if (t) setTur(t);
    const g = enumParam(p, 'g', ['negatif', 'sifir', 'disla'] as const);
    if (g) setGecmis(g);
    const f = numParam(p, 'f');
    if (f !== null) setFaiz(f);
    const e = enumParam(p, 'e', ['365', '360'] as const);
    if (e) setEsas(e);
  }, []);

  const guncelle = (id: number, patch: Partial<Satir>) => setSatirlar((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const sil = (id: number) => setSatirlar((list) => (list.length > 1 ? list.filter((x) => x.id !== id) : list));
  const ekle = () => setSatirlar((list) => [...list, yeniSatir(null, '', null)]);

  // Baz tarih değişince "gün" girişindeki satırların vade tarihleri yeniden bulunur; "tarih" girişinde günler güncellenir.
  const bazDegisti = (yeni: string) => {
    setBaz(yeni);
    if (!isValidIsoDate(yeni)) return;
    setSatirlar((list) =>
      list.map((x) =>
        tur === 'gun' && x.gun !== null
          ? { ...x, vade: addDaysIso(yeni, x.gun) }
          : isValidIsoDate(x.vade)
            ? { ...x, gun: daysBetween(yeni, x.vade) }
            : x,
      ),
    );
  };

  const turDegisti = (yeni: VadeTuru) => {
    setTur(yeni);
    if (yeni === 'gun' && isValidIsoDate(baz)) {
      setSatirlar((list) => list.map((x) => ({ ...x, gun: isValidIsoDate(x.vade) ? daysBetween(baz, x.vade) : x.gun })));
    }
  };

  const gunDegisti = (id: number, gun: number | null) => {
    guncelle(id, { gun, vade: gun !== null && Number.isFinite(gun) && isValidIsoDate(baz) ? addDaysIso(baz, Math.round(gun)) : '' });
  };

  const bazHata = validateBaz(baz);
  const hatalar = satirlar.map((x) => {
    const e = validateSatir(x.tutar, x.vade);
    if (tur === 'gun' && x.gun === null) return { ...e, vade: 'Bir gün sayısı girin.' };
    return e;
  });
  const gecerli = !bazHata && hatalar.every((e) => !e.tutar && !e.vade);

  const sonuc = useMemo(
    () =>
      gecerli
        ? hesaplaOrtalamaVade({
            baz,
            gecmis,
            faizOrani: faiz,
            gunEsasi: esas === '360' ? 360 : 365,
            satirlar: satirlar.map((x) => ({ tutar: x.tutar!, vade: x.vade, ad: x.ad })),
          })
        : null,
    [gecerli, baz, gecmis, faiz, esas, satirlar],
  );

  const gunMetni = (n: number) => `${formatNumber(n, 0)} gün`;

  const ozet = sonuc
    ? [
        `Baz tarih: ${formatDateTR(baz)}`,
        `Toplam tutar: ${formatTL(sonuc.toplamTutar)}`,
        `Ortalama vade: ${gunMetni(sonuc.ortalamaGunYuvarlak)} (${formatDateTR(sonuc.ortalamaVadeTarihi)})`,
        ...(sonuc.faizli ? [`Faizli denk vade: ${formatNumber(sonuc.faizli.gun, 1)} gün (${formatDateTR(sonuc.faizli.tarih)})`] : []),
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <DateField
          id="ov-baz"
          label="Baz tarih (hesap günü)"
          value={baz}
          onChange={bazDegisti}
          error={bazHata}
          hint="Günler bu tarihten itibaren sayılır. Varsayılan bugündür."
        />

        <Segmented
          name="ov-tur"
          label="Vadeler nasıl girilsin?"
          value={tur}
          onChange={turDegisti}
          options={[
            { value: 'tarih', label: 'Vade tarihi' },
            { value: 'gun', label: 'Bazdan itibaren gün' },
          ]}
        />

        <div class="field">
          <span class="field__label">Çek / senet listesi</span>
          <ul class="line-items">
            {satirlar.map((x, i) => (
              <li class="line-item" key={x.id}>
                <div class="line-item__head">
                  <span>Satır {i + 1}</span>
                  {satirlar.length > 1 && (
                    <button type="button" class="line-item__remove" onClick={() => sil(x.id)} aria-label={`Satır ${i + 1}’i sil`}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
                <div class="line-item__fields">
                  <NumberField
                    id={`ov-tutar-${x.id}`}
                    label="Tutar"
                    value={x.tutar}
                    onChange={(v) => guncelle(x.id, { tutar: v })}
                    suffix="TL"
                    placeholder="ör. 10.000"
                    error={hatalar[i].tutar}
                  />
                  {tur === 'tarih' ? (
                    <DateField
                      id={`ov-vade-${x.id}`}
                      label="Vade tarihi"
                      value={x.vade}
                      onChange={(v) => guncelle(x.id, { vade: v, gun: isValidIsoDate(v) && isValidIsoDate(baz) ? daysBetween(baz, v) : null })}
                      error={hatalar[i].vade}
                    />
                  ) : (
                    <NumberField
                      id={`ov-gun-${x.id}`}
                      label="Vadeye kalan gün"
                      value={x.gun}
                      onChange={(v) => gunDegisti(x.id, v)}
                      suffix="gün"
                      decimals={0}
                      inputMode="numeric"
                      placeholder="ör. 45"
                      error={hatalar[i].vade}
                      hint={isValidIsoDate(x.vade) ? `Vade: ${formatDateTR(x.vade)}` : undefined}
                    />
                  )}
                </div>
                <TextField
                  id={`ov-ad-${x.id}`}
                  label="Açıklama (isteğe bağlı)"
                  value={x.ad}
                  onChange={(v) => guncelle(x.id, { ad: v })}
                  placeholder="ör. Çek no, müşteri"
                />
              </li>
            ))}
          </ul>
          <button type="button" class="btn btn--small add-row" onClick={ekle}>
            + Satır ekle
          </button>
        </div>

        <Details summary="Vadesi geçmiş satırlar ve faiz (gelişmiş)">
          <div class="calc-inputs">
            <Segmented
              name="ov-gecmis"
              label="Vadesi geçmiş satırlar"
              value={gecmis}
              onChange={setGecmis}
              options={[
                { value: 'negatif', label: 'Negatif gün' },
                { value: 'sifir', label: '0 gün say' },
                { value: 'disla', label: 'Hesaba katma' },
              ]}
              hint="Baz tarihten önce vadesi dolmuş satırlar nasıl ele alınsın? Varsayılan, matematiksel olarak doğru olan negatif gündür."
            />
            <div class="row-2">
              <NumberField
                id="ov-faiz"
                label="Yıllık faiz (isteğe bağlı)"
                value={faiz}
                onChange={setFaiz}
                suffix="%"
                placeholder="ör. 45"
                hint="Girerseniz faizi dikkate alan denk vade de hesaplanır."
              />
              <Segmented
                name="ov-esas"
                label="Gün esası"
                value={esas}
                onChange={setEsas}
                options={[
                  { value: '365', label: '365 gün' },
                  { value: '360', label: '360 gün' },
                ]}
              />
            </div>
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {sonuc ? (
          <>
            <ResultHero
              label="Tutar ağırlıklı ortalama vade"
              value={gunMetni(sonuc.ortalamaGunYuvarlak)}
              sub={
                <>
                  Ortalama vade tarihi: <strong>{formatDateTR(sonuc.ortalamaVadeTarihi)}</strong> (ondalıklı: {formatNumber(sonuc.ortalamaGun, 2)} gün)
                </>
              }
            />

            <StatGrid
              items={[
                { label: 'Toplam tutar', value: formatTL(sonuc.toplamTutar) },
                { label: 'Düz ortalama (tutarsız)', value: gunMetni(sonuc.basitOrtalamaGun) },
                { label: 'En erken vade', value: formatDateTR(sonuc.enErkenVade) },
                { label: 'En geç vade', value: formatDateTR(sonuc.enGecVade) },
              ]}
            />

            <Breakdown
              title="Nasıl hesaplandı?"
              rows={[
                { label: 'Σ (tutar × gün)', value: formatNumber(sonuc.satirlar.reduce((t, s) => t + s.tutarGun, 0), 2) },
                { label: 'Σ tutar (ortalamaya giren)', value: formatTL(sonuc.hesaplananTutar) },
                { label: 'Ortalama vade (gün)', value: formatNumber(sonuc.ortalamaGun, 2), kind: 'total' },
              ]}
            />

            {sonuc.gecikmisSayisi > 0 && (
              <Callout kind="warning">
                <strong>
                  {sonuc.gecikmisSayisi} satırın vadesi baz tarihten önce ({formatTL(sonuc.gecikmisTutar)}).
                </strong>{' '}
                {gecmisAciklama[gecmis]}
              </Callout>
            )}

            {sonuc.faizli && (
              <Callout kind="info">
                <strong>Faizi dikkate alan denk vade:</strong> yıllık %{formatNumber(faiz ?? 0, 2)} faizle bütün tutarın tek seferde
                ödenebileceği denk vade {formatNumber(sonuc.faizli.gun, 1)} gün sonradır ({formatDateTR(sonuc.faizli.tarih)}). Faiz
                varken uzak vadeli tutarların bugünkü değeri orantısız azaldığı için denk tarih, düz ağırlıklı ortalamadan biraz
                öne gelir.
              </Callout>
            )}

            <DataTable
              caption="Satır dökümü"
              columns={[
                { key: 'no', label: 'Satır' },
                { key: 'tutar', label: 'Tutar' },
                { key: 'vade', label: 'Vade' },
                { key: 'gun', label: 'Gün' },
                { key: 'pay', label: 'Pay' },
                { key: 'tg', label: 'Tutar × gün' },
              ]}
              rows={sonuc.satirlar.map((s, i) => ({
                no: s.ad || `${i + 1}`,
                tutar: formatTL(s.tutar),
                vade: formatDateTR(s.vade),
                gun: s.dahil ? `${formatNumber(s.etkinGun ?? 0, 0)}${s.gecikmis && gecmis === 'sifir' ? ' (gecikmiş)' : ''}` : 'dışarıda',
                pay: s.dahil ? `%${formatNumber(s.pay * 100, 1)}` : '–',
                tg: s.dahil ? formatNumber(s.tutarGun, 0) : '–',
              }))}
              foot={{
                no: 'Toplam',
                tutar: formatTL(sonuc.toplamTutar),
                vade: '',
                gun: gunMetni(sonuc.ortalamaGunYuvarlak),
                pay: '%100',
                tg: formatNumber(sonuc.satirlar.reduce((t, s) => t + s.tutarGun, 0), 0),
              }}
            />

            <ShareBar
              params={{
                baz,
                tur,
                s: satirlar.map((x) => `${x.tutar}:${x.vade}`).join(','),
                g: gecmis === 'negatif' ? null : gecmis,
                f: faiz && faiz > 0 ? faiz : null,
                e: faiz && faiz > 0 && esas === '360' ? esas : null,
              }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>
            {gecerli ? 'Ortalamaya girecek vadesi gelmemiş bir tutar yok.' : 'Sonucu görmek için baz tarihi ve her satıra geçerli bir tutar ile vade girin.'}
          </ResultEmpty>
        )}
      </div>
    </div>
  );
}
