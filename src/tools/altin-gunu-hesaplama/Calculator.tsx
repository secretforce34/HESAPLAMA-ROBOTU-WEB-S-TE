import { useEffect, useMemo, useState } from 'preact/hooks';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, Segmented } from '../../ui/fields';
import { Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import { hesaplaAltinGunu, siraAraligi, validateAltinGunu, yillikKarsilik, type KatkiBirimi } from './calc';

const turAdi = (t: 'tl' | 'altin') => (t === 'tl' ? 'TL günü' : 'altın günü');
const isaretli = (n: number) => `${n > 0 ? '+' : ''}${formatTL(n)}`;

export default function Calculator() {
  // Aylık oran ve altın artışı örnek varsayımlardır; her kullanıcı kendi beklentisini yazar.
  const [katilimci, setKatilimci] = useState<number | null>(12);
  const [birim, setBirim] = useState<KatkiBirimi>('tl');
  const [katki, setKatki] = useState<number | null>(5000);
  const [altinFiyati, setAltinFiyati] = useState<number | null>(null);
  const [aylikOran, setAylikOran] = useState<number | null>(3);
  const [altinArtisi, setAltinArtisi] = useState<number | null>(2.5);
  const [alanOder, setAlanOder] = useState(true);
  const [sira, setSira] = useState<number | null>(6);

  useEffect(() => {
    // Paylaşılan bağlantı: ?n=12&birim=gram&katki=3&fiyat=4500&oran=3&artis=2.5&alan=1&sira=6
    const p = readParams();
    const n = numParam(p, 'n');
    if (n !== null) setKatilimci(n);
    const b = enumParam(p, 'birim', ['tl', 'gram', 'ceyrek'] as const);
    if (b) setBirim(b);
    const k = numParam(p, 'katki');
    if (k !== null) setKatki(k);
    const f = numParam(p, 'fiyat');
    if (f !== null) setAltinFiyati(f);
    const o = numParam(p, 'oran');
    if (o !== null) setAylikOran(o);
    const a = numParam(p, 'artis');
    if (a !== null) setAltinArtisi(a);
    const al = boolParam(p, 'alan');
    if (al !== null) setAlanOder(al);
    const s = numParam(p, 'sira');
    if (s !== null) setSira(s);
  }, []);

  const hatalar = validateAltinGunu({ katilimci, birim, katki, altinFiyati, aylikOran, altinArtisi, sira });
  const gecerli = Object.keys(hatalar).length === 0 && katilimci !== null && katki !== null && aylikOran !== null && altinArtisi !== null;

  const sonuc = useMemo(
    () =>
      gecerli
        ? hesaplaAltinGunu({
            katilimci: katilimci as number,
            birim,
            katki: katki as number,
            altinFiyati,
            aylikOran: aylikOran as number,
            altinArtisi: altinArtisi as number,
            alanOder,
          })
        : null,
    [gecerli, katilimci, birim, katki, altinFiyati, aylikOran, altinArtisi, alanOder],
  );

  const secili = sonuc ? sonuc.siralar[Math.min(Math.max((sira ?? 1) - 1, 0), sonuc.siralar.length - 1)] : null;
  const seciliKarsi = sonuc?.karsi ? sonuc.karsi[(secili?.sira ?? 1) - 1] : null;

  const birimEk = birim === 'tl' ? 'TL' : birim === 'gram' ? 'gram' : 'adet';
  const fiyatEtiketi =
    birim === 'tl'
      ? 'Gram altın fiyatı (karşılaştırma için, isteğe bağlı)'
      : birim === 'gram'
        ? 'Gram altın fiyatı'
        : 'Çeyrek altın fiyatı';
  const altinMiktariBirimi = birim === 'gram' ? 'g' : 'çeyrek';

  // Dönüş yönünü açıklayan cümle (öneri değil, varsayımın sonucu)
  const aciklama = (() => {
    if (!sonuc || aylikOran === null || altinArtisi === null) return null;
    if (sonuc.tur === 'tl') {
      if (aylikOran > 0)
        return `TL gününde katkı her ay aynı TL tutarındadır. Aylık %${formatNumber(aylikOran, 2)} varsayımıyla paranın değeri zamanla azalır: kasayı erken alan, değeri daha yüksek parayı alır ve geç ödediği katkıların değeri düşer. Sıra ilerledikçe net fark azalır.`;
      if (aylikOran < 0)
        return 'Aylık oranı negatif girdiniz (para değer kazanıyor); bu durumda sıra ilerledikçe alınan paranın değeri artar, sonraki sıralar lehine olur.';
      return 'Aylık oran %0 olduğu için paranın değeri değişmiyor; TL gününde hiçbir sıra kazanmaz ya da kaybetmez.';
    }
    if (Math.abs(sonuc.rho - 1) < 1e-9)
      return `Altın fiyatı artışı (%${formatNumber(altinArtisi, 2)}) aylık orana (%${formatNumber(aylikOran, 2)}) eşit olduğu için altının TL değeri enflasyona/alternatife göre sabit kalır; altın gününde sıranın önemi yoktur.`;
    if (sonuc.rho > 1)
      return `Altın fiyatı artışı varsayımınız (%${formatNumber(altinArtisi, 2)}) aylık orandan (%${formatNumber(aylikOran, 2)}) yüksek. Altın günü bu durumda geç alanlar lehine işler: kasayı beklediğiniz her ay altının değeri paranın değerinden hızlı artar. TL gününde ise aynı enflasyon erken alanı korur.`;
    return `Altın fiyatı artışı varsayımınız (%${formatNumber(altinArtisi, 2)}) aylık orandan (%${formatNumber(aylikOran, 2)}) düşük. Bu durumda altın gününde de TL günündeki gibi kasayı erken alan avantajlıdır, ancak fark TL gününe göre daha küçüktür.`;
  })();

  const ozet =
    sonuc && secili
      ? [
          `${turAdi(sonuc.tur)} · ${katilimci} katılımcı · ${secili.sira}. sıra`,
          `Aylık oran varsayımı: %${formatNumber(aylikOran ?? 0, 2)}${sonuc.tur === 'altin' || altinFiyati ? ` · altın artışı: %${formatNumber(altinArtisi ?? 0, 2)}` : ''}`,
          `Ödenenlerin bugünkü değeri: ${formatTL(secili.odenenBugun)}`,
          `Alınanın bugünkü değeri: ${formatTL(secili.alinanBugun)}`,
          `Net fark: ${isaretli(secili.net)}`,
          `Kazançlı sıralar: ${siraAraligi(sonuc.kazancliSiralar)}`,
        ].join('\n')
      : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <p class="calc-section-title">1. Gün</p>
        <NumberField
          id="ag-katilimci"
          label="Katılımcı sayısı (gün süresi, ay)"
          value={katilimci}
          onChange={setKatilimci}
          decimals={0}
          inputMode="numeric"
          suffix="kişi"
          error={hatalar.katilimci}
          hint="Her ay bir kişi kasayı alır; gün katılımcı sayısı kadar ay sürer."
        />
        <Segmented
          name="ag-birim"
          label="Aylık katkı neyle yapılıyor?"
          value={birim}
          onChange={setBirim}
          options={[
            { value: 'tl', label: 'TL' },
            { value: 'gram', label: 'Gram altın' },
            { value: 'ceyrek', label: 'Çeyrek altın' },
          ]}
        />
        <div class="row-2">
          <NumberField
            id="ag-katki"
            label="Aylık katkı"
            value={katki}
            onChange={setKatki}
            suffix={birimEk}
            decimals={birim === 'tl' ? 2 : 3}
            error={hatalar.katki}
          />
          <NumberField
            id="ag-fiyat"
            label={fiyatEtiketi}
            value={altinFiyati}
            onChange={setAltinFiyati}
            suffix="TL"
            error={hatalar.altinFiyati}
            hint={birim === 'tl' ? 'Girerseniz aynı başlangıç değeriyle altın günü de hesaplanır.' : 'Bugünkü fiyatı siz yazarsınız; site fiyat çekmez.'}
          />
        </div>
        <Segmented
          name="ag-alan"
          label="Sırası gelen kişi o ay da katkı öder mi?"
          value={alanOder ? 'evet' : 'hayir'}
          onChange={(v) => setAlanOder(v === 'evet')}
          options={[
            { value: 'evet', label: 'Öder (kasa N katkı)' },
            { value: 'hayir', label: 'Ödemez (kasa N−1 katkı)' },
          ]}
          hint="Sonuçtaki net fark ikisinde de aynıdır; yalnızca ödenen ve alınan toplamlar değişir."
        />

        <p class="calc-section-title">2. Varsayımlarınız (örnek değerlerdir)</p>
        <div class="row-2">
          <NumberField
            id="ag-oran"
            label="Aylık enflasyon / alternatif getiri"
            value={aylikOran}
            onChange={setAylikOran}
            suffix="% / ay"
            error={hatalar.aylikOran}
            hint={
              aylikOran !== null && !hatalar.aylikOran
                ? `Yıllık bileşik karşılığı %${formatNumber(yillikKarsilik(aylikOran), 2)}. Paranın zaman değerini ölçer.`
                : 'Paranın zaman değerini ölçer.'
            }
          />
          <NumberField
            id="ag-artis"
            label="Altın fiyatı aylık artışı"
            value={altinArtisi}
            onChange={setAltinArtisi}
            suffix="% / ay"
            error={hatalar.altinArtisi}
            hint={
              altinArtisi !== null && !hatalar.altinArtisi
                ? `Yıllık bileşik karşılığı %${formatNumber(yillikKarsilik(altinArtisi), 2)}. Altın katkıda ve karşılaştırmada kullanılır.`
                : 'Altın katkıda ve karşılaştırmada kullanılır.'
            }
          />
        </div>
        <NumberField
          id="ag-sira"
          label="Sizin sıranız"
          value={sira}
          onChange={setSira}
          decimals={0}
          inputMode="numeric"
          error={hatalar.sira}
          hint="Özet bu sıraya göre verilir; tablo tüm sıraları gösterir."
        />
        <Callout kind="info">
          Oran ve artış değerleri tahmin değildir; yalnızca “şöyle olursa” senaryosudur. Gerçek enflasyon ve altın fiyatı bu
          varsayımlardan farklı olacaktır. Kendi beklentinizi yazarak farklı senaryoları deneyebilirsiniz.
        </Callout>
      </div>

      <div class="calc-results">
        {sonuc && secili ? (
          <>
            <ResultHero
              label={`${secili.sira}. sırada net fark (bugünkü değerle)`}
              value={isaretli(secili.net)}
              sub={
                <>
                  Ödenenlerin bugünkü değeri {formatTL(secili.odenenBugun)} · alınanın bugünkü değeri{' '}
                  <strong>{formatTL(secili.alinanBugun)}</strong>
                  {secili.netOran !== null && <> · {formatPercent(secili.netOran)}</>}
                </>
              }
            />

            <StatGrid
              items={[
                { label: 'Aylık katkı (ilk ay)', value: sonuc.tur === 'altin' ? `${formatNumber(katki ?? 0, 3)} ${altinMiktariBirimi} (${formatTL(sonuc.ilkAyKatkiTL)})` : formatTL(sonuc.ilkAyKatkiTL) },
                { label: 'Ödeme sayısı', value: `${sonuc.odemeSayisi} ay` },
                {
                  label: `${secili.sira}. ayda alınan`,
                  value:
                    sonuc.alinacakAltin !== null
                      ? `${formatNumber(sonuc.alinacakAltin, 3)} ${altinMiktariBirimi} (${formatTL(secili.alinanNominal)})`
                      : formatTL(secili.alinanNominal),
                },
                { label: 'Toplam ödenen', value: formatTL(secili.odenenNominal) },
                { label: 'Kazançlı sıralar', value: siraAraligi(sonuc.kazancliSiralar) },
              ]}
            />

            {aciklama && <Callout kind="info">{aciklama}</Callout>}

            {seciliKarsi && sonuc.karsiTur && (
              <Callout kind="info">
                <strong>{secili.sira}. sırada karşılaştırma:</strong> {turAdi(sonuc.tur)} için net fark{' '}
                {isaretli(secili.net)}, aynı başlangıç değeriyle {turAdi(sonuc.karsiTur)} için {isaretli(seciliKarsi.net)}.
                Bu fark, girdiğiniz oran ve altın artışı varsayımlarından doğar; aynı gün içinde altın ve TL gününün
                enflasyon karşısındaki davranışının farkını gösterir.
              </Callout>
            )}
            {sonuc.tur === 'tl' && !sonuc.karsi && (
              <p class="field__hint">Altın gününü karşılaştırmak için soldaki “Gram altın fiyatı” kutusuna bugünkü fiyatı yazın.</p>
            )}

            <DataTable
              scroll
              caption="Sıra sıra döküm"
              columns={[
                { key: 'sira', label: 'Sıra' },
                { key: 'odenen', label: 'Ödenen' },
                { key: 'alinan', label: 'Alınan' },
                { key: 'odenenBd', label: 'Ödenen (bugünkü)' },
                { key: 'alinanBd', label: 'Alınan (bugünkü)' },
                { key: 'net', label: `Net (${turAdi(sonuc.tur)})` },
                ...(sonuc.karsi && sonuc.karsiTur ? [{ key: 'karsi', label: `Net (${turAdi(sonuc.karsiTur)})` }] : []),
              ]}
              rows={sonuc.siralar.map((s, i) => ({
                sira: s.sira === secili.sira ? <strong>{s.sira} (siz)</strong> : String(s.sira),
                odenen: formatTL(s.odenenNominal),
                alinan: formatTL(s.alinanNominal),
                odenenBd: formatTL(s.odenenBugun),
                alinanBd: formatTL(s.alinanBugun),
                net: s.sira === secili.sira ? <strong>{isaretli(s.net)}</strong> : isaretli(s.net),
                karsi: sonuc.karsi ? isaretli(sonuc.karsi[i].net) : '',
              }))}
            />

            <Details summary="Hesap nasıl yapılıyor?">
              <p class="field__hint">
                Her ay herkes katkısını ayın başında öder ve o ayın sırasındaki kişi kasayı alır; 1. ay bugündür. Her nakit
                akışı, aylık orana göre bugüne iskonto edilir: akış ÷ (1 + oran)^(ay − 1). Altın katkıda her katkının TL
                değeri, altın fiyatının aylık artışıyla büyür. Net fark = alınanın bugünkü değeri − ödenenlerin bugünkü
                değeri. Herkesin ödemesi aynıdır; fark yalnızca kasayı hangi ay aldığından doğar ve tüm katılımcıların
                net farklarının toplamı sıfırdır.
              </p>
            </Details>

            <ShareBar
              params={{
                n: katilimci,
                birim: birim === 'tl' ? null : birim,
                katki,
                fiyat: altinFiyati,
                oran: aylikOran,
                artis: altinArtisi,
                alan: alanOder ? null : false,
                sira,
              }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için kırmızı işaretli alanları düzeltin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
