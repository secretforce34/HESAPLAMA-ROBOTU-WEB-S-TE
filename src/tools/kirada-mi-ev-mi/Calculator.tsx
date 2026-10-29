import { useMemo, useState } from 'preact/hooks';
import { evAlimMasraflari } from '../../data/params/ev-alim';
import type { EnerjiSinifi } from '../../data/params/kredi';
import { formatNumber, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, SelectField } from '../../ui/fields';
import { LineChart } from '../../ui/LineChart';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { basabasKira, karsilastir, kdoKontrol, validateKiraEv } from './calc';

const SINIFLAR: { value: EnerjiSinifi; label: string }[] = [
  { value: 'diger', label: 'D, E, F, G veya bilinmiyor' },
  { value: 'c', label: 'C sınıfı' },
  { value: 'ab', label: 'A veya B sınıfı' },
];

export default function Calculator() {
  const [fiyat, setFiyat] = useState<number | null>(5_000_000);
  const [pesinat, setPesinat] = useState<number | null>(2_000_000);
  const [faiz, setFaiz] = useState<number | null>(2.49);
  const [vade, setVade] = useState<number | null>(120);
  const [kira, setKira] = useState<number | null>(25_000);
  const [kiraArtisi, setKiraArtisi] = useState<number | null>(30);
  const [evArtisi, setEvArtisi] = useState<number | null>(30);
  const [getiri, setGetiri] = useState<number | null>(35);
  const [yil, setYil] = useState<number | null>(10);
  const [emlakci, setEmlakci] = useState<number | null>(2);
  const [diger, setDiger] = useState<number | null>(15_000);
  const [sahiplik, setSahiplik] = useState<number | null>(0.5);
  const [sinif, setSinif] = useState<EnerjiSinifi>('diger');
  const [baskaKonut, setBaskaKonut] = useState(false);
  const [enflasyon, setEnflasyon] = useState<number | null>(null);

  const errors = validateKiraEv({ fiyat, pesinat, faiz, vade, kira, kiraArtisi, evArtisi, getiri, yil });
  const krediVar = fiyat !== null && pesinat !== null && pesinat < fiyat;

  const sonuc = useMemo(() => {
    if (Object.keys(errors).length > 0) return null;
    const girdi = {
      evFiyati: fiyat!,
      pesinat: pesinat!,
      aylikFaiz: faiz ?? 0,
      vade: vade ?? 1,
      aylikKira: kira!,
      kiraArtisi: kiraArtisi!,
      evDegerArtisi: evArtisi!,
      getiri: getiri!,
      emlakciYuzde: emlakci ?? 0,
      digerMasraf: diger ?? 0,
      sahiplikYuzde: sahiplik ?? 0,
      yil: yil!,
    };
    return { r: karsilastir(girdi), basabas: basabasKira(girdi), kdo: kdoKontrol(fiyat!, pesinat!, sinif, baskaKonut) };
  }, [fiyat, pesinat, faiz, vade, kira, kiraArtisi, evArtisi, getiri, yil, emlakci, diger, sahiplik, sinif, baskaKonut, JSON.stringify(errors)]);

  const reel = (n: number) => (enflasyon ? n / Math.pow(1 + enflasyon / 100, yil ?? 0) : null);

  let ozet = '';
  if (sonuc) {
    const { r } = sonuc;
    ozet = [
      `${yil} yıl sonunda ${r.fark >= 0 ? 'ev almak' : 'kirada kalmak'} ${formatTL(Math.abs(r.fark), 0)} daha avantajlı`,
      `Ev alırsanız servet: ${formatTL(r.alanServet, 0)}`,
      `Kirada kalırsanız servet: ${formatTL(r.kiraciServet, 0)}`,
      sonuc.basabas !== null ? `Başabaş kira: ${formatTL(sonuc.basabas, 0)}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <div class="row-2">
          <NumberField id="ke-fiyat" label="Ev fiyatı" value={fiyat} onChange={setFiyat} suffix="TL" error={errors.fiyat} />
          <NumberField
            id="ke-pesinat"
            label="Peşinat"
            value={pesinat}
            onChange={setPesinat}
            suffix="TL"
            error={errors.pesinat}
            hint={krediVar && fiyat !== null && pesinat !== null ? `Kredi: ${formatTL(fiyat - pesinat, 0)}` : 'Kredi kullanılmıyor.'}
          />
        </div>
        {krediVar && (
          <div class="row-2">
            <NumberField id="ke-faiz" label="Konut kredisi aylık faizi" value={faiz} onChange={setFaiz} suffix="%" error={errors.faiz} />
            <NumberField id="ke-vade" label="Vade" value={vade} onChange={setVade} suffix="ay" decimals={0} error={errors.vade} />
          </div>
        )}
        <div class="row-2">
          <NumberField
            id="ke-kira"
            label="Aynı evin aylık kirası"
            value={kira}
            onChange={setKira}
            suffix="TL"
            error={errors.kira}
          />
          <NumberField
            id="ke-kira-artisi"
            label="Kiranın yıllık artışı"
            value={kiraArtisi}
            onChange={setKiraArtisi}
            suffix="%"
            error={errors.kiraArtisi}
            hint="Konutta yasal sınır: 12 aylık TÜFE ortalaması."
          />
        </div>
        <div class="row-2">
          <NumberField
            id="ke-ev-artisi"
            label="Ev fiyatının yıllık artışı"
            value={evArtisi}
            onChange={setEvArtisi}
            suffix="%"
            error={errors.evArtisi}
            hint="Tahmin; geçmişe bakarak siz belirleyin."
          />
          <NumberField
            id="ke-getiri"
            label="Paranın yıllık net getirisi"
            value={getiri}
            onChange={setGetiri}
            suffix="%"
            error={errors.getiri}
            hint="Kenara konan para (ör. mevduat, fon) ne kazandırır?"
          />
        </div>
        <NumberField id="ke-yil" label="Kaç yıllık karşılaştırma?" value={yil} onChange={setYil} suffix="yıl" decimals={0} error={errors.yil} />
        <Details summary="Masraflar, kredi sınırı ve enflasyon">
          <div class="row-2">
            <NumberField
              id="ke-emlakci"
              label="Emlakçı (alıcı payı, KDV hariç)"
              value={emlakci}
              onChange={setEmlakci}
              suffix="%"
              hint={`Tapu harcı (%${evAlimMasraflari.values.tapuHarciYuzde}) otomatik eklenir.`}
            />
            <NumberField
              id="ke-diger"
              label="Diğer alım masrafları"
              value={diger}
              onChange={setDiger}
              suffix="TL"
              hint="Döner sermaye, ekspertiz, tahsis ücreti, taşınma."
            />
          </div>
          <NumberField
            id="ke-sahiplik"
            label="Ev sahibinin yıllık masrafları (ev değerinin %'si)"
            value={sahiplik}
            onChange={setSahiplik}
            suffix="%"
            hint="Emlak vergisi, bakım-onarım, DASK. Aidatı iki tarafta da ödenir sayıp dahil etmeyin."
          />
          <div class="row-2">
            <SelectField id="ke-sinif" label="Enerji kimlik belgesi sınıfı" value={sinif} options={SINIFLAR} onChange={setSinif} />
            <NumberField
              id="ke-enflasyon"
              label="Beklenen yıllık enflasyon"
              value={enflasyon}
              onChange={setEnflasyon}
              suffix="%"
              hint="Doldurursanız sonuç bugünkü paraya da çevrilir."
            />
          </div>
          <CheckboxField
            id="ke-baska-konut"
            label="Kendimin, eşimin veya 18 yaş altı çocuğumun başka konutu var"
            checked={baskaKonut}
            onChange={setBaskaKonut}
          />
        </Details>
      </div>

      <div class="calc-results">
        {sonuc ? (
          <>
            <ResultHero
              label={`${yil} yıl sonunda`}
              value={sonuc.r.fark >= 0 ? 'Ev almak avantajlı' : 'Kirada kalmak avantajlı'}
              sub={
                <>
                  Fark <strong>{formatTL(Math.abs(sonuc.r.fark), 0)}</strong>
                  {reel(sonuc.r.fark) !== null && ` · bugünkü parayla ${formatTL(Math.abs(reel(sonuc.r.fark)!), 0)}`}
                </>
              }
            />
            <StatGrid
              items={[
                { label: 'Ev alırsanız servetiniz', value: formatTL(sonuc.r.alanServet, 0) },
                { label: 'Kirada kalırsanız servetiniz', value: formatTL(sonuc.r.kiraciServet, 0) },
                {
                  label: 'Başabaş kira',
                  value: sonuc.basabas === null ? 'Her durumda kira' : sonuc.basabas === 0 ? 'Her durumda ev' : formatTL(sonuc.basabas, 0),
                },
              ]}
            />
            {sonuc.basabas !== null && sonuc.basabas > 0 && (
              <p class="field__hint" style={{ margin: 0 }}>
                Bugünkü aylık kira {formatTL(sonuc.basabas, 0)} üzerindeyse ev almak, altındaysa kirada kalıp parayı değerlendirmek daha
                kazançlı. Ev, bugünkü kirayla kendini {formatNumber(fiyat! / (kira! * 12), 1)} yılda amorti ediyor.
              </p>
            )}
            {krediVar && sonuc.kdo.asiyor && (
              <Callout kind="warning">
                BDDK sınırı: {formatTL(fiyat!, 0)} değerindeki bu konut için kredi en fazla değerin %{formatNumber(sonuc.kdo.kdo, 1)}’i,
                yani {formatTL(sonuc.kdo.azamiKredi, 0)} olabilir. Peşinat en az {formatTL(sonuc.kdo.asgariPesinat, 0)} olmalı.
              </Callout>
            )}
            <LineChart
              label="Yıllara göre servet: ev alan ve kiracı"
              xLabels={sonuc.r.yillar.map((y) => `${y.yil}. yıl`)}
              series={[
                { label: 'Ev alırsanız', values: sonuc.r.yillar.map((y) => y.alanServet), color: 'var(--c1)' },
                { label: 'Kirada kalırsanız', values: sonuc.r.yillar.map((y) => y.kiraciServet), color: 'var(--c2)' },
              ]}
              formatY={(n) => formatTL(n, 0)}
            />
            <Breakdown
              title="Ev alırsanız"
              rows={[
                { label: 'Peşinat', value: formatTL(pesinat!, 0) },
                { label: 'Alım masrafları', value: formatTL(sonuc.r.alimMasrafi, 0), hint: 'Tapu harcı, emlakçı, diğer' },
                ...(sonuc.r.kredi > 0
                  ? [
                      { label: 'Aylık taksit', value: formatTL(sonuc.r.taksit) },
                      { label: `${yil} yılda ödenen faiz`, value: formatTL(sonuc.r.toplamFaiz, 0) },
                    ]
                  : []),
                { label: 'Sahiplik masrafları', value: formatTL(sonuc.r.toplamSahiplik, 0) },
                { label: `${yil} yıl sonra ev değeri`, value: formatTL(sonuc.r.evDegeri, 0), kind: 'plus' as const },
                ...(sonuc.r.kalanBorc > 0 ? [{ label: 'Kalan kredi borcu', value: formatTL(sonuc.r.kalanBorc, 0), kind: 'minus' as const }] : []),
                { label: 'Toplam servet (ev + yatırım − borç)', value: formatTL(sonuc.r.alanServet, 0), kind: 'total' as const },
              ]}
            />
            <Breakdown
              title="Kirada kalırsanız"
              rows={[
                { label: 'Başta yatırıma konan', value: formatTL(sonuc.r.baslangicNakit, 0), hint: 'Peşinat + alım masrafları' },
                { label: `${yil} yılda ödenen kira`, value: formatTL(sonuc.r.toplamKira, 0) },
                { label: 'Toplam servet (yatırım)', value: formatTL(sonuc.r.kiraciServet, 0), kind: 'total' as const },
              ]}
            />
            <Details summary="Yıl yıl karşılaştırma tablosu">
              <DataTable
                scroll
                columns={[
                  { key: 'y', label: 'Yıl' },
                  { key: 'k', label: 'Aylık kira' },
                  { key: 'e', label: 'Ev değeri' },
                  { key: 'b', label: 'Kalan borç' },
                  { key: 'a', label: 'Ev alan servet' },
                  { key: 'c', label: 'Kiracı servet' },
                ]}
                rows={sonuc.r.yillar.slice(1).map((y) => ({
                  y: `${y.yil}. yıl`,
                  k: formatTL(y.aylikKira, 0),
                  e: formatTL(y.evDegeri, 0),
                  b: formatTL(y.kalanBorc, 0),
                  a: formatTL(y.alanServet, 0),
                  c: formatTL(y.kiraciServet, 0),
                }))}
              />
            </Details>
            <Callout kind="info">
              İki taraf her ay aynı parayı harcar: o ay kim daha az öderse farkı yatırıma koyar. Evin satış masrafları ve vergiler
              hesaba katılmaz. Sonuç girdiğiniz artış ve getiri tahminlerine çok duyarlıdır; birkaç farklı senaryo deneyin.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için alanları doldurun.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
