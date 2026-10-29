import { useRef, useState } from 'preact/hooks';
import { formatNumber, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField, TextField } from '../../ui/fields';
import { Breakdown, Callout, Details, ResultEmpty, ResultHero, StackedBar, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { donusumBasabasKm, hesaplaMaliyet, hesaplaYolculuk, sarjFiyati, validateYakit, YAKIT_BIRIM, yakitKmBasina, type Yakit } from './calc';

type Mod = 'maliyet' | 'yolculuk';

interface GiderSatiri {
  id: number;
  ad: string;
  tutar: number | null;
  donem: 'aylik' | 'yillik';
}

// Örnek değerler; kullanıcı kendi pompa fiyatını ve tüketimini yazar.
const VARSAYILAN: Record<Yakit, { tuketim: number; fiyat: number }> = {
  benzin: { tuketim: 6.5, fiyat: 60 },
  dizel: { tuketim: 5.5, fiyat: 62 },
  lpg: { tuketim: 8.5, fiyat: 30 },
  elektrik: { tuketim: 16, fiyat: 4 },
};

const YAKITLAR: { value: Yakit; label: string }[] = [
  { value: 'benzin', label: 'Benzin' },
  { value: 'dizel', label: 'Dizel' },
  { value: 'lpg', label: 'LPG' },
  { value: 'elektrik', label: 'Elektrik' },
];

const silIkon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
  </svg>
);

export default function Calculator() {
  const sayac = useRef(100);
  const [mod, setMod] = useState<Mod>('maliyet');
  const [yakit, setYakit] = useState<Yakit>('benzin');
  const [tuketim, setTuketim] = useState<number | null>(VARSAYILAN.benzin.tuketim);
  const [fiyat, setFiyat] = useState<number | null>(VARSAYILAN.benzin.fiyat);
  const [disFiyat, setDisFiyat] = useState<number | null>(12);
  const [evOrani, setEvOrani] = useState<number | null>(70);

  const [yillikKm, setYillikKm] = useState<number | null>(15_000);
  const [giderler, setGiderler] = useState<GiderSatiri[]>([
    { id: 1, ad: 'Zorunlu trafik sigortası', tutar: 12_000, donem: 'yillik' },
    { id: 2, ad: 'Kasko', tutar: 30_000, donem: 'yillik' },
    { id: 3, ad: 'MTV', tutar: 6_000, donem: 'yillik' },
    { id: 4, ad: 'Bakım ve onarım', tutar: 12_000, donem: 'yillik' },
    { id: 5, ad: 'Lastik (yıllık payı)', tutar: 6_000, donem: 'yillik' },
    { id: 6, ad: 'Muayene (yıllık payı)', tutar: 1_500, donem: 'yillik' },
    { id: 7, ad: 'Otopark, otoyol ve köprü', tutar: 1_000, donem: 'aylik' },
  ]);
  const [aracDegeri, setAracDegeri] = useState<number | null>(null);
  const [degerKaybi, setDegerKaybi] = useState<number | null>(null);
  const [yeniYakit, setYeniYakit] = useState<Yakit>('lpg');
  const [yeniTuketim, setYeniTuketim] = useState<number | null>(VARSAYILAN.lpg.tuketim);
  const [yeniFiyat, setYeniFiyat] = useState<number | null>(VARSAYILAN.lpg.fiyat);
  const [donusum, setDonusum] = useState<number | null>(null);

  const [mesafe, setMesafe] = useState<number | null>(450);
  const [gidisDonus, setGidisDonus] = useState(true);
  const [ucret, setUcret] = useState<number | null>(0);
  const [kisi, setKisi] = useState<number | null>(1);

  const yakitSec = (y: Yakit) => {
    setYakit(y);
    setTuketim(VARSAYILAN[y].tuketim);
    setFiyat(VARSAYILAN[y].fiyat);
  };
  const yeniYakitSec = (y: Yakit) => {
    setYeniYakit(y);
    setYeniTuketim(VARSAYILAN[y].tuketim);
    setYeniFiyat(VARSAYILAN[y].fiyat);
  };

  const birim = YAKIT_BIRIM[yakit];
  const elektrik = yakit === 'elektrik';
  const errors = validateYakit({ tuketim, fiyat });
  const birimFiyat = fiyat !== null ? (elektrik ? sarjFiyati(fiyat, disFiyat ?? fiyat, evOrani ?? 100) : fiyat) : 0;
  const yakitTamam = Object.keys(errors).length === 0;

  const maliyet =
    mod === 'maliyet' && yakitTamam && yillikKm !== null && yillikKm > 0
      ? hesaplaMaliyet({
          yillikKm,
          tuketim100: tuketim!,
          birimFiyat,
          giderler: giderler.map((g) => ({ ad: g.ad.trim(), tutar: g.tutar ?? 0, donem: g.donem })),
          aracDegeri: aracDegeri ?? 0,
          degerKaybi: degerKaybi ?? 0,
        })
      : null;
  const yolculuk =
    mod === 'yolculuk' && yakitTamam && mesafe !== null && mesafe > 0
      ? hesaplaYolculuk({ mesafe, gidisDonus, tuketim100: tuketim!, birimFiyat, ucretler: ucret ?? 0, kisi: Math.max(1, Math.floor(kisi ?? 1)) })
      : null;

  const yeniKm = yeniTuketim && yeniFiyat ? yakitKmBasina(yeniTuketim, yeniFiyat) : null;
  const karsilastirma =
    maliyet && yeniKm !== null
      ? {
          fark: maliyet.yakitKmBasina - yeniKm,
          yillik: (maliyet.yakitKmBasina - yeniKm) * yillikKm!,
          basabas: donusum ? donusumBasabasKm(donusum, maliyet.yakitKmBasina, yeniKm) : null,
        }
      : null;

  let ozet = '';
  if (maliyet)
    ozet = [
      `Km başına maliyet: ${formatTL(maliyet.kmBasina)}`,
      `Aylık: ${formatTL(maliyet.aylik, 0)} · yıllık: ${formatTL(maliyet.yillik, 0)}`,
      `Km başına yakıt: ${formatTL(maliyet.yakitKmBasina)}`,
    ].join('\n');
  else if (yolculuk)
    ozet = [`${formatNumber(yolculuk.km, 0)} km yolculuk: ${formatTL(yolculuk.toplam, 0)}`, `Kişi başı: ${formatTL(yolculuk.kisiBasi, 0)}`].join('\n');

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="ak-mod"
          label="Ne hesaplanacak?"
          value={mod}
          onChange={setMod}
          options={[
            { value: 'maliyet', label: 'Aylık ve km başına maliyet' },
            { value: 'yolculuk', label: 'Yolculuk masrafı' },
          ]}
        />
        <Segmented name="ak-yakit" label="Yakıt türü" value={yakit} onChange={yakitSec} options={YAKITLAR} hint="Hibrit araçta benzin seçip ortalama tüketimi yazın." />
        <div class="row-2">
          <NumberField
            id="ak-tuketim"
            label={`Ortalama tüketim (${birim.tuketim})`}
            value={tuketim}
            onChange={setTuketim}
            error={errors.tuketim}
            hint="Aracın göstergesindeki ortalama."
          />
          <NumberField
            id="ak-fiyat"
            label={elektrik ? 'Evde şarj fiyatı' : 'Pompa fiyatı'}
            value={fiyat}
            onChange={setFiyat}
            suffix={birim.fiyat}
            error={errors.fiyat}
            hint="Örnek değer; güncel fiyatı yazın."
          />
        </div>
        {elektrik && (
          <div class="row-2">
            <NumberField id="ak-dis" label="Dışarıda (hızlı) şarj fiyatı" value={disFiyat} onChange={setDisFiyat} suffix="TL/kWh" />
            <NumberField id="ak-ev-orani" label="Şarjın evde yapılan kısmı" value={evOrani} onChange={setEvOrani} suffix="%" />
          </div>
        )}

        {mod === 'maliyet' ? (
          <>
            <NumberField id="ak-km" label="Yılda kaç km yapıyorsunuz?" value={yillikKm} onChange={setYillikKm} suffix="km" decimals={0} />
            <div class="field">
              <span class="field__label">Diğer giderler</span>
              <p class="field__hint" style={{ margin: 0 }}>
                Örnek tutarlardır; kendi poliçe ve faturalarınızı yazın. Olmayanı 0 yapın ya da silin.
              </p>
              <ul class="line-items">
                {giderler.map((g, i) => (
                  <li class="line-item" key={g.id}>
                    <div class="line-item__head">
                      <span>Gider {i + 1}</span>
                      <button type="button" class="line-item__remove" aria-label={`${g.ad || `Gider ${i + 1}`} satırını sil`} onClick={() => setGiderler((l) => l.filter((x) => x.id !== g.id))}>
                        {silIkon}
                      </button>
                    </div>
                    <div class="line-item__fields">
                      <TextField id={`ak-gad-${g.id}`} label="Gider" value={g.ad} onChange={(v) => setGiderler((l) => l.map((x) => (x.id === g.id ? { ...x, ad: v } : x)))} />
                      <NumberField
                        id={`ak-gtu-${g.id}`}
                        label="Tutar"
                        value={g.tutar}
                        onChange={(v) => setGiderler((l) => l.map((x) => (x.id === g.id ? { ...x, tutar: v } : x)))}
                        suffix="TL"
                      />
                      <SelectField
                        id={`ak-gdo-${g.id}`}
                        label="Dönem"
                        value={g.donem}
                        options={[
                          { value: 'yillik', label: 'Yıllık' },
                          { value: 'aylik', label: 'Aylık' },
                        ]}
                        onChange={(v) => setGiderler((l) => l.map((x) => (x.id === g.id ? { ...x, donem: v } : x)))}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" class="btn btn--small add-row" onClick={() => setGiderler((l) => [...l, { id: sayac.current++, ad: '', tutar: null, donem: 'yillik' }])}>
                + Gider ekle
              </button>
            </div>
            <Details summary="Değer kaybı">
              <div class="row-2">
                <NumberField id="ak-deger" label="Aracın bugünkü değeri" value={aracDegeri} onChange={setAracDegeri} suffix="TL" />
                <NumberField
                  id="ak-kayip"
                  label="Yıllık değer kaybı"
                  value={degerKaybi}
                  onChange={setDegerKaybi}
                  suffix="%"
                  hint="Enflasyon karşısında reel kayıp; ör. %5–10."
                />
              </div>
            </Details>
            <Details summary="Başka yakıtla karşılaştır (LPG dönüşümü, elektrikli)">
              <Segmented name="ak-yeni-yakit" label="Karşılaştırılacak yakıt" value={yeniYakit} onChange={yeniYakitSec} options={YAKITLAR} />
              <div class="row-2">
                <NumberField id="ak-yeni-tuketim" label={`Tüketim (${YAKIT_BIRIM[yeniYakit].tuketim})`} value={yeniTuketim} onChange={setYeniTuketim} />
                <NumberField id="ak-yeni-fiyat" label="Birim fiyat" value={yeniFiyat} onChange={setYeniFiyat} suffix={YAKIT_BIRIM[yeniYakit].fiyat} />
              </div>
              <NumberField
                id="ak-donusum"
                label="Dönüşüm veya geçiş maliyeti"
                value={donusum}
                onChange={setDonusum}
                suffix="TL"
                hint="Ör. LPG kiti ve montajı. Kaç km’de kendini çıkardığı hesaplanır."
              />
            </Details>
          </>
        ) : (
          <>
            <div class="row-2">
              <NumberField id="ak-mesafe" label="Mesafe (tek yön)" value={mesafe} onChange={setMesafe} suffix="km" decimals={0} />
              <NumberField id="ak-kisi" label="Kaç kişi paylaşacak?" value={kisi} onChange={setKisi} decimals={0} />
            </div>
            <CheckboxField id="ak-gidis-donus" label="Gidiş-dönüş" checked={gidisDonus} onChange={setGidisDonus} />
            <NumberField id="ak-ucret" label="Otoyol, köprü ve otopark ücretleri (toplam)" value={ucret} onChange={setUcret} suffix="TL" />
          </>
        )}
      </div>

      <div class="calc-results">
        {maliyet ? (
          <>
            <ResultHero
              label="Kilometre başına maliyet"
              value={formatTL(maliyet.kmBasina)}
              sub={
                <>
                  Aylık <strong>{formatTL(maliyet.aylik, 0)}</strong> · yıllık {formatTL(maliyet.yillik, 0)}
                </>
              }
            />
            <StatGrid
              items={[
                { label: 'Km başına yakıt', value: formatTL(maliyet.yakitKmBasina) },
                { label: '100 km yakıt', value: formatTL(maliyet.yakitKmBasina * 100) },
                { label: `Yıllık ${birim.miktar}`, value: formatNumber(maliyet.yillikMiktar, 0) },
              ]}
            />
            <Breakdown
              title="Yıllık giderler"
              rows={[
                ...maliyet.kalemler.map((k) => ({ label: k.ad, value: formatTL(k.yillik, 0), hint: `km başına ${formatTL(k.kmBasina)}` })),
                { label: 'Toplam', value: formatTL(maliyet.yillik, 0), kind: 'total' as const },
              ]}
            />
            <StackedBar label="Giderlerin dağılımı" parts={maliyet.kalemler.map((k) => ({ label: k.ad, value: k.yillik, display: formatTL(k.yillik, 0) }))} />
            {karsilastirma && (
              <Callout kind={karsilastirma.fark > 0 ? 'success' : 'info'}>
                {YAKITLAR.find((y) => y.value === yeniYakit)!.label} ile km başına yakıt {formatTL(yeniKm!)} olur;{' '}
                {karsilastirma.fark > 0
                  ? `yılda ${formatTL(karsilastirma.yillik, 0)} tasarruf edersiniz.`
                  : `yılda ${formatTL(-karsilastirma.yillik, 0)} daha fazla ödersiniz.`}
                {karsilastirma.basabas !== null &&
                  ` Dönüşüm maliyeti ${formatNumber(karsilastirma.basabas, 0)} km’de (yaklaşık ${formatNumber(karsilastirma.basabas / yillikKm!, 1)} yılda) kendini çıkarır.`}
              </Callout>
            )}
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : yolculuk ? (
          <>
            <ResultHero
              label={`${formatNumber(yolculuk.km, 0)} km yolculuk masrafı`}
              value={formatTL(yolculuk.toplam, 0)}
              sub={
                (kisi ?? 1) > 1 ? (
                  <>
                    Kişi başı <strong>{formatTL(yolculuk.kisiBasi, 0)}</strong>
                  </>
                ) : undefined
              }
            />
            <Breakdown
              rows={[
                {
                  label: elektrik ? 'Şarj' : 'Yakıt',
                  value: formatTL(yolculuk.yakit),
                  hint: `${formatNumber(yolculuk.miktar, 1)} ${birim.miktar} × ${formatTL(birimFiyat)}`,
                },
                ...((ucret ?? 0) > 0 ? [{ label: 'Otoyol, köprü, otopark', value: formatTL(ucret!) }] : []),
                { label: 'Toplam', value: formatTL(yolculuk.toplam), kind: 'total' as const },
                ...((kisi ?? 1) > 1 ? [{ label: `Kişi başı (${Math.floor(kisi!)} kişi)`, value: formatTL(yolculuk.kisiBasi) }] : []),
              ]}
            />
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için alanları doldurun.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
