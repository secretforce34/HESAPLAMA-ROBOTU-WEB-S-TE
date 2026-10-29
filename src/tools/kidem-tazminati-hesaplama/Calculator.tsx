import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatTL } from '../../lib/format';
import { CheckboxField, DateField, NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, ResultEmpty, ResultHero, StatGrid, type BreakdownRow } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, dateParam, numParam, readParams } from '../../ui/url';
import {
  EN_ERKEN_CIKIS,
  EN_GEC_CIKIS,
  hesaplaKidem,
  validateEkOdeme,
  validateKidem,
  type Periyot,
} from './calc';

type EkTur = 'yemek' | 'yol' | 'ikramiye' | 'prim' | 'diger';
const TUR_SECENEKLERI: { value: EkTur; label: string }[] = [
  { value: 'yemek', label: 'Yemek yardımı' },
  { value: 'yol', label: 'Yol yardımı' },
  { value: 'ikramiye', label: 'İkramiye' },
  { value: 'prim', label: 'Düzenli prim' },
  { value: 'diger', label: 'Diğer (giyim, yakacak…)' },
];
const PERIYOT_SECENEKLERI: { value: Periyot; label: string }[] = [
  { value: 'aylik', label: 'Aylık' },
  { value: 'yillik', label: 'Yıllık' },
  { value: 'gunluk', label: 'Günlük' },
];
const VARSAYILAN_PERIYOT: Record<EkTur, Periyot> = {
  yemek: 'gunluk',
  yol: 'gunluk',
  ikramiye: 'yillik',
  prim: 'aylik',
  diger: 'aylik',
};
// Paylaşım bağlantısında kısa kodlar
const PERIYOT_KOD: Record<Periyot, string> = { aylik: 'a', yillik: 'y', gunluk: 'g' };
const KOD_PERIYOT: Record<string, Periyot> = { a: 'aylik', y: 'yillik', g: 'gunluk' };

interface EkSatir {
  id: number;
  tur: EkTur;
  tutar: number | null;
  periyot: Periyot;
  gun: number | null;
}

type MatrahYontemi = 'tahmin' | 'bordro';

const sureMetni = (s: { yil: number; ay: number; gun: number }) =>
  [s.yil ? `${s.yil} yıl` : '', s.ay ? `${s.ay} ay` : '', s.gun ? `${s.gun} gün` : ''].filter(Boolean).join(' ') || '0 gün';

export default function Calculator() {
  const sayac = useRef(1);
  const yeniEk = (tur: EkTur = 'yemek', tutar: number | null = null, periyot?: Periyot, gun: number | null = 22): EkSatir => ({
    id: sayac.current++,
    tur,
    tutar,
    periyot: periyot ?? VARSAYILAN_PERIYOT[tur],
    gun,
  });

  const [giris, setGiris] = useState('2019-03-15');
  const [cikis, setCikis] = useState(EN_GEC_CIKIS < '2026-10-29' ? EN_GEC_CIKIS : '2026-10-29');
  const [sonBrut, setSonBrut] = useState<number | null>(50000);
  const [ekler, setEkler] = useState<EkSatir[]>([]);
  const [ihbarHesapla, setIhbarHesapla] = useState(true);
  const [ihbarKullandirildi, setIhbarKullandirildi] = useState(false);
  const [yontem, setYontem] = useState<MatrahYontemi>('tahmin');
  const [kumulatif, setKumulatif] = useState<number | null>(null);

  useEffect(() => {
    // Varsayılan çıkış tarihi: bugün (desteklenen aralıktaysa)
    const bugun = todayIsoTR();
    if (bugun >= EN_ERKEN_CIKIS && bugun <= EN_GEC_CIKIS) setCikis(bugun);

    // ?giris=2019-03-15&cikis=2026-10-29&brut=50000&ek=yemek:300:g:22,ikramiye:100000:y&ihbar=0&kull=1&kum=382500
    const p = readParams();
    const g = dateParam(p, 'giris');
    if (g) setGiris(g);
    const c = dateParam(p, 'cikis');
    if (c) setCikis(c);
    const b = numParam(p, 'brut');
    if (b !== null && b > 0) setSonBrut(b);
    const ek = p.get('ek');
    if (ek) {
      const list = ek
        .split(',')
        .map((s) => s.split(':'))
        .filter(([t, v, per]) => TUR_SECENEKLERI.some((x) => x.value === t) && Number.isFinite(Number(v)) && KOD_PERIYOT[per])
        .slice(0, 20)
        .map(([t, v, per, gun]) => yeniEk(t as EkTur, Number(v), KOD_PERIYOT[per], gun ? Number(gun) : 22));
      if (list.length > 0) setEkler(list);
    }
    if (boolParam(p, 'ihbar') === false) setIhbarHesapla(false);
    if (boolParam(p, 'kull') === true) setIhbarKullandirildi(true);
    const k = numParam(p, 'kum');
    if (k !== null && k >= 0) {
      setYontem('bordro');
      setKumulatif(k);
    }
  }, []);

  const guncelle = (id: number, patch: Partial<EkSatir>) =>
    setEkler((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const sil = (id: number) => setEkler((list) => list.filter((s) => s.id !== id));
  const ekle = () =>
    setEkler((list) => {
      const kullanilan = new Set(list.map((x) => x.tur));
      const tur = TUR_SECENEKLERI.find((x) => !kullanilan.has(x.value))?.value ?? 'diger';
      return [...list, yeniEk(tur)];
    });

  const bordroMatrahi = ihbarHesapla && !ihbarKullandirildi && yontem === 'bordro';
  const hatalar = validateKidem({
    giris,
    cikis,
    sonBrut,
    oncekiKumulatif: bordroMatrahi ? kumulatif : null,
  });
  const kumHata = bordroMatrahi && kumulatif === null ? 'Kümülatif matrahı girin (Ocak’ta 0).' : hatalar.oncekiKumulatif;
  const ekHatalari = ekler.map((e) => validateEkOdeme(e.tutar, e.periyot, e.gun));
  const gecerli =
    Object.keys(hatalar).length === 0 && !kumHata && ekHatalari.every((h) => !h.tutar && !h.gun);

  const sonuc = useMemo(
    () =>
      gecerli
        ? hesaplaKidem({
            giris,
            cikis,
            sonBrut: sonBrut!,
            ekOdemeler: ekler.map((e) => ({ tutar: e.tutar!, periyot: e.periyot, gun: e.gun ?? 0 })),
            ihbarHesapla,
            ihbarKullandirildi,
            oncekiKumulatif: bordroMatrahi ? kumulatif : null,
          })
        : null,
    [gecerli, giris, cikis, sonBrut, ekler, ihbarHesapla, ihbarKullandirildi, bordroMatrahi, kumulatif],
  );

  const kidemSatirlari: BreakdownRow[] = sonuc
    ? [
        {
          label: 'Kıdeme esas aylık ücret',
          value: formatTL(sonuc.kidemEsas),
          hint: sonuc.tavanUygulandi ? `Tavan uygulandı (giydirilmiş ücret ${formatTL(sonuc.giydirilmis)})` : 'Giydirilmiş brüt ücret',
        },
        { label: `${sonuc.sure.yil} tam yıl × aylık ücret`, value: formatTL(sonuc.kidemYilTutari), kind: 'sub' },
        ...(sonuc.sure.ay > 0
          ? [{ label: `${sonuc.sure.ay} ay × aylık ücret ÷ 12`, value: formatTL(sonuc.kidemAyTutari), kind: 'sub' as const }]
          : []),
        ...(sonuc.sure.gun > 0
          ? [{ label: `${sonuc.sure.gun} gün × aylık ücret ÷ 365`, value: formatTL(sonuc.kidemGunTutari), kind: 'sub' as const }]
          : []),
        { label: 'Brüt kıdem tazminatı', value: formatTL(sonuc.kidemBrut) },
        {
          label: 'Damga vergisi (binde 7,59)',
          value: formatTL(sonuc.kidemDamga),
          kind: 'minus',
          hint: 'Gelir vergisi kesilmez (GVK md. 25/7).',
        },
        { label: 'Net kıdem tazminatı', value: formatTL(sonuc.kidemNet), kind: 'total' },
      ]
    : [];

  const ihbarSatirlari: BreakdownRow[] = sonuc
    ? [
        { label: 'Günlük giydirilmiş brüt ücret', value: formatTL(sonuc.gunlukBrut), hint: 'Aylık giydirilmiş ücret ÷ 30' },
        {
          label: `Brüt ihbar tazminatı (${sonuc.ihbarHafta} hafta = ${sonuc.ihbarGun} gün)`,
          value: formatTL(sonuc.ihbarBrut),
        },
        {
          label: 'Gelir vergisi',
          value: formatTL(sonuc.ihbarGv),
          kind: 'minus',
          hint: `Dilim %${sonuc.ihbarDilim}; önceki kümülatif matrah ${formatTL(sonuc.oncekiKumulatif)}${sonuc.kumulatifTahmini ? ' (tahmini)' : ''}`,
        },
        { label: 'Damga vergisi (binde 7,59)', value: formatTL(sonuc.ihbarDv), kind: 'minus' },
        { label: 'Net ihbar tazminatı', value: formatTL(sonuc.ihbarNet), kind: 'total' },
      ]
    : [];

  const ozet = sonuc
    ? [
        `Hizmet süresi: ${sureMetni(sonuc.sure)} (${formatDateTR(giris)} – ${formatDateTR(cikis)})`,
        `Giydirilmiş brüt ücret: ${formatTL(sonuc.giydirilmis)}`,
        `Kıdem tazminatı: brüt ${formatTL(sonuc.kidemBrut)}, net ${formatTL(sonuc.kidemNet)}${sonuc.tavanUygulandi ? ` (tavan ${formatTL(sonuc.tavan)})` : ''}`,
        ...(sonuc.ihbarBrut > 0
          ? [`İhbar tazminatı (${sonuc.ihbarHafta} hafta): brüt ${formatTL(sonuc.ihbarBrut)}, net ${formatTL(sonuc.ihbarNet)}`]
          : []),
        `Toplam net: ${formatTL(sonuc.toplamNet)}`,
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <div class="row-2">
          <DateField
            id="kt-giris"
            label="İşe giriş tarihi"
            value={giris}
            onChange={setGiris}
            max={cikis || undefined}
            error={hatalar.giris}
          />
          <DateField
            id="kt-cikis"
            label="İşten çıkış tarihi"
            value={cikis}
            onChange={setCikis}
            min={EN_ERKEN_CIKIS}
            max={EN_GEC_CIKIS}
            error={hatalar.cikis}
            hint="Son çalışılan gün. Tavan bu tarihe göre seçilir."
          />
        </div>

        <NumberField
          id="kt-brut"
          label="Son aylık brüt ücret"
          value={sonBrut}
          onChange={setSonBrut}
          suffix="TL"
          placeholder="ör. 50.000"
          error={hatalar.sonBrut}
          hint="Ek ödemeler hariç çıplak brüt ücret."
        />

        <div class="field">
          <span class="field__label">Düzenli ek ödemeler (giydirilmiş ücrete eklenir)</span>
          {ekler.length > 0 && (
            <ul class="line-items">
              {ekler.map((e, i) => (
                <li class="line-item" key={e.id}>
                  <div class="line-item__head">
                    <span>Ek ödeme {i + 1}</span>
                    <button
                      type="button"
                      class="line-item__remove"
                      onClick={() => sil(e.id)}
                      aria-label={`Ek ödeme ${i + 1}’i sil`}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div class="line-item__fields">
                    <SelectField
                      id={`kt-ek-tur-${e.id}`}
                      label="Tür"
                      value={e.tur}
                      onChange={(v) => guncelle(e.id, { tur: v, periyot: VARSAYILAN_PERIYOT[v] })}
                      options={TUR_SECENEKLERI}
                    />
                    <SelectField
                      id={`kt-ek-periyot-${e.id}`}
                      label="Ödeme sıklığı"
                      value={e.periyot}
                      onChange={(v) => guncelle(e.id, { periyot: v })}
                      options={PERIYOT_SECENEKLERI}
                    />
                  </div>
                  <div class="line-item__fields">
                    <NumberField
                      id={`kt-ek-tutar-${e.id}`}
                      label={e.periyot === 'gunluk' ? 'Günlük brüt tutar' : e.periyot === 'yillik' ? 'Yıllık brüt tutar' : 'Aylık brüt tutar'}
                      value={e.tutar}
                      onChange={(v) => guncelle(e.id, { tutar: v })}
                      suffix="TL"
                      error={ekHatalari[i].tutar}
                    />
                    {e.periyot === 'gunluk' && (
                      <NumberField
                        id={`kt-ek-gun-${e.id}`}
                        label="Ayda kaç gün"
                        value={e.gun}
                        onChange={(v) => guncelle(e.id, { gun: v })}
                        suffix="gün"
                        decimals={0}
                        inputMode="numeric"
                        error={ekHatalari[i].gun}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button type="button" class="btn btn--small add-row" onClick={ekle}>
            + Ek ödeme ekle
          </button>
          <p class="field__hint">
            Yemek, yol, ikramiye, düzenli prim gibi sürekli verilen ödemeler kıdem ve ihbar tazminatına eklenir. Arızi
            ödemeler (bir kez verilen prim, fazla mesai) eklenmez.
          </p>
        </div>

        <CheckboxField
          id="kt-ihbar"
          label="İhbar tazminatını da hesapla"
          checked={ihbarHesapla}
          onChange={setIhbarHesapla}
          hint="İşveren, bildirim süresi vermeden ya da süreye ait ücreti peşin ödemeden sözleşmeyi feshettiyse doğar."
        />
        {ihbarHesapla && (
          <CheckboxField
            id="kt-ihbar-kull"
            label="İhbar süresi kullandırıldı (önelli fesih)"
            checked={ihbarKullandirildi}
            onChange={setIhbarKullandirildi}
            hint="Bildirim süresi boyunca çalıştırıldıysanız ya da süre ücreti peşin ödendiyse işaretleyin."
          />
        )}
        {ihbarHesapla && !ihbarKullandirildi && (
          <>
            <Segmented
              name="kt-matrah"
              label="İhbar tazminatının gelir vergisi için"
              value={yontem}
              onChange={setYontem}
              options={[
                { value: 'tahmin', label: 'Ücretimden tahmin et' },
                { value: 'bordro', label: 'Bordrodan gireceğim' },
              ]}
              hint={
                yontem === 'tahmin'
                  ? 'Bu yıl aynı ücretle çalıştığınız varsayılır; kümülatif matrah buna göre bulunur.'
                  : undefined
              }
            />
            {yontem === 'bordro' && (
              <NumberField
                id="kt-kumulatif"
                label="Çıkış ayından önceki kümülatif vergi matrahı"
                value={kumulatif}
                onChange={setKumulatif}
                suffix="TL"
                error={kumHata}
                hint="Bir önceki ayın bordrosundaki “kümülatif vergi matrahı”. Ocak’ta ayrıldıysanız 0 yazın."
              />
            )}
          </>
        )}
      </div>

      <div class="calc-results">
        {sonuc ? (
          <>
            <ResultHero
              label="Toplam net tazminat"
              value={formatTL(sonuc.toplamNet)}
              sub={
                <>
                  Kıdem <strong>{formatTL(sonuc.kidemNet)}</strong>
                  {sonuc.ihbarBrut > 0 && (
                    <>
                      {' '}
                      + ihbar <strong>{formatTL(sonuc.ihbarNet)}</strong>
                    </>
                  )}{' '}
                  · brüt toplam {formatTL(sonuc.toplamBrut)}
                </>
              }
            />

            <StatGrid
              items={[
                { label: 'Hizmet süresi', value: sureMetni(sonuc.sure) },
                { label: 'Giydirilmiş brüt ücret', value: formatTL(sonuc.giydirilmis) },
                { label: 'Kıdem tavanı (çıkış tarihinde)', value: formatTL(sonuc.tavan) },
                { label: 'İhbar süresi', value: `${sonuc.ihbarHafta} hafta` },
              ]}
            />

            {sonuc.tavanUygulandi && sonuc.kidemHakki && (
              <Callout kind="warning">
                <strong>Tavan uygulandı.</strong> Giydirilmiş brüt ücretiniz ({formatTL(sonuc.giydirilmis)}),{' '}
                {formatDateTR(sonuc.tavanDonemi.from)} – {formatDateTR(sonuc.tavanDonemi.to)} dönemi kıdem tavanını (
                {formatTL(sonuc.tavan)}) aşıyor. Kıdem tazminatı tavan üzerinden hesaplandı; tavan olmasaydı brüt tutar{' '}
                {formatTL(sonuc.kidemBrutTavansiz)} olurdu. İhbar tazminatında tavan uygulanmaz.
              </Callout>
            )}

            {sonuc.kidemHakki ? (
              <Breakdown title="Kıdem tazminatı" rows={kidemSatirlari} />
            ) : (
              <Callout kind="warning">
                <strong>Kıdem tazminatı doğmaz.</strong> Hizmet süreniz ({sureMetni(sonuc.sure)}) bir yılı doldurmuyor; 1475
                sayılı Kanun md. 14 en az bir yıl çalışmayı şart koşar.
              </Callout>
            )}

            {ihbarHesapla && !ihbarKullandirildi && <Breakdown title="İhbar tazminatı" rows={ihbarSatirlari} />}
            {ihbarHesapla && ihbarKullandirildi && (
              <Callout kind="info">
                İhbar süresi kullandırıldığı ya da süre ücreti peşin ödendiği için ihbar tazminatı doğmaz. Sizin için yasal
                süre {sonuc.ihbarHafta} haftadır (4857 md. 17).
              </Callout>
            )}

            {ihbarHesapla && !ihbarKullandirildi && sonuc.kumulatifTahmini && (
              <Callout kind="info">
                İhbar tazminatının vergisi, tazminatın son ücretinizle aynı ay ödendiği ve bu yıl aynı ücretle çalıştığınız
                varsayımıyla hesaplandı. Bordronuzdaki kümülatif matrahı girerseniz sonuç kesinleşir.
              </Callout>
            )}

            <ShareBar
              params={{
                giris,
                cikis,
                brut: sonBrut,
                ek:
                  ekler.length > 0
                    ? ekler
                        .map((e) => `${e.tur}:${e.tutar ?? 0}:${PERIYOT_KOD[e.periyot]}${e.periyot === 'gunluk' ? `:${e.gun ?? 0}` : ''}`)
                        .join(',')
                    : null,
                ihbar: ihbarHesapla ? null : false,
                kull: ihbarHesapla && ihbarKullandirildi ? true : null,
                kum: bordroMatrahi ? kumulatif : null,
              }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için giriş ve çıkış tarihlerini, son brüt ücretinizi girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
