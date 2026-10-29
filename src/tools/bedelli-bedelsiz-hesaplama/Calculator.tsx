import { useEffect, useMemo, useState } from 'preact/hooks';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, Segmented } from '../../ui/fields';
import { Breakdown, Callout, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { numParam, readParams } from '../../ui/url';
import { oranMetni, portfoy, validateArtirim } from './calc';

type Kullanim = 'tamami' | 'hic' | 'kismen';

const fiyat3 = (n: number) => `${formatNumber(n, 3, 2)} TL`;

export default function Calculator() {
  const [kapanis, setKapanis] = useState<number | null>(50);
  const [bedelsiz, setBedelsiz] = useState<number | null>(100);
  const [bedelli, setBedelli] = useState<number | null>(0);
  const [rucan, setRucan] = useState<number | null>(1);
  const [temettu, setTemettu] = useState<number | null>(0);
  const [lot, setLot] = useState<number | null>(100);
  const [kullanim, setKullanim] = useState<Kullanim>('tamami');
  const [kismiYuzde, setKismiYuzde] = useState<number | null>(50);

  useEffect(() => {
    const p = readParams();
    const set = (k: string, f: (v: number) => void) => {
      const v = numParam(p, k);
      if (v !== null) f(v);
    };
    set('fiyat', setKapanis);
    set('bedelsiz', setBedelsiz);
    set('bedelli', setBedelli);
    set('rucan', setRucan);
    set('temettu', setTemettu);
    set('lot', setLot);
  }, []);

  const errors = validateArtirim({ kapanis, bedelsiz, bedelli, rucan, temettu, lot });
  if (kullanim === 'kismen' && (kismiYuzde === null || kismiYuzde < 0 || kismiYuzde > 100)) errors.kismi = '0 ile 100 arasında bir oran girin.';
  const gecerli = Object.keys(errors).length === 0;
  const kullanimOrani = kullanim === 'tamami' ? 1 : kullanim === 'hic' ? 0 : (kismiYuzde ?? 0) / 100;

  const s = useMemo(
    () =>
      gecerli
        ? portfoy({
            kapanis: kapanis!,
            bedelsizYuzde: bedelsiz!,
            bedelliYuzde: bedelli!,
            rucanFiyati: rucan ?? 1,
            brutTemettu: temettu!,
            lot: lot!,
            kullanim: kullanimOrani,
          })
        : null,
    [gecerli, kapanis, bedelsiz, bedelli, rucan, temettu, lot, kullanimOrani],
  );

  const bedelliVar = (bedelli ?? 0) > 0;
  const ozet = s
    ? [
        `Kapanış: ${fiyat3(kapanis!)} · bedelsiz %${formatNumber(bedelsiz!)} · bedelli %${formatNumber(bedelli!)}${temettu ? ` · temettü ${formatTL(temettu)}` : ''}`,
        `Teorik fiyat: ${fiyat3(s.teorikFiyat)}`,
        `${formatNumber(lot!, 0)} lot → ${formatNumber(s.toplamLot, 2)} lot`,
        bedelliVar ? `Rüçhan ödemesi: ${formatTL(s.odeme)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <NumberField
          id="bb-kapanis"
          label="Son kapanış fiyatı"
          value={kapanis}
          onChange={setKapanis}
          suffix="TL"
          decimals={3}
          error={errors.kapanis}
          hint="Hakların kullanıldığı günden önceki son kapanış."
        />
        <div class="row-2">
          <NumberField
            id="bb-bedelsiz"
            label="Bedelsiz oranı"
            value={bedelsiz}
            onChange={setBedelsiz}
            suffix="%"
            decimals={4}
            error={errors.bedelsiz}
            hint={bedelsiz ? oranMetni(bedelsiz) : 'İç kaynak + pay olarak dağıtılan temettü'}
          />
          <NumberField
            id="bb-bedelli"
            label="Bedelli oranı"
            value={bedelli}
            onChange={setBedelli}
            suffix="%"
            decimals={4}
            error={errors.bedelli}
            hint={bedelli ? oranMetni(bedelli) : 'Rüçhan hakkı (yeni pay alma) oranı'}
          />
        </div>
        <div class="row-2">
          <NumberField
            id="bb-rucan"
            label="Rüçhan kullanma fiyatı"
            value={rucan}
            onChange={setRucan}
            suffix="TL"
            error={errors.rucan}
            hint="Genelde 1 TL nominal; primli artırımda daha yüksek."
          />
          <NumberField
            id="bb-temettu"
            label="Brüt nakit temettü"
            value={temettu}
            onChange={setTemettu}
            suffix="TL/pay"
            decimals={4}
            error={errors.temettu}
            hint="Aynı gün ödenmiyorsa 0 bırakın."
          />
        </div>
        <NumberField
          id="bb-lot"
          label="Elimdeki pay"
          value={lot}
          onChange={setLot}
          suffix="lot"
          decimals={0}
          inputMode="numeric"
          error={errors.lot}
        />
        {bedelliVar && (
          <>
            <Segmented
              name="bb-kullanim"
              label="Rüçhan hakkımı"
              value={kullanim}
              onChange={setKullanim}
              options={[
                { value: 'tamami', label: 'Tamamen kullanacağım' },
                { value: 'kismen', label: 'Kısmen' },
                { value: 'hic', label: 'Kullanmayacağım' },
              ]}
            />
            {kullanim === 'kismen' && (
              <NumberField
                id="bb-kismi"
                label="Kullanacağım kısım"
                value={kismiYuzde}
                onChange={setKismiYuzde}
                suffix="%"
                error={errors.kismi}
              />
            )}
          </>
        )}
      </div>

      <div class="calc-results">
        {s ? (
          <>
            <ResultHero
              label="Teorik (düzeltilmiş) fiyat"
              value={fiyat3(s.teorikFiyat)}
              sub={
                <>
                  Kapanış {fiyat3(kapanis!)} · değişim {formatPercent(((s.teorikFiyat - kapanis!) / kapanis!) * 100, 2)}
                </>
              }
            />
            <Breakdown
              title="Paylarınız"
              rows={[
                { label: 'Mevcut pay', value: `${formatNumber(lot!, 0)} lot` },
                ...(s.bedelsizYeniLot > 0
                  ? [{ label: 'Bedelsizden gelen', value: `+${formatNumber(s.bedelsizYeniLot, 2)} lot`, kind: 'plus' as const }]
                  : []),
                ...(s.bedelliYeniLot > 0
                  ? [{ label: 'Bedelliden alınan', value: `+${formatNumber(s.bedelliYeniLot, 2)} lot`, kind: 'plus' as const }]
                  : []),
                { label: 'Toplam pay', value: `${formatNumber(s.toplamLot, 2)} lot`, kind: 'total' },
              ]}
            />
            <Breakdown
              title="Değer karşılaştırması"
              rows={[
                { label: 'Öncesi (kapanışla)', value: formatTL(s.oncekiDeger) },
                { label: 'Sonrası (teorik fiyatla)', value: formatTL(s.sonrakiPayDegeri) },
                ...(s.temettu > 0 ? [{ label: 'Brüt temettü (nakit)', value: formatTL(s.temettu), kind: 'plus' as const }] : []),
                ...(s.odeme > 0 ? [{ label: 'Rüçhan için ödeme', value: formatTL(s.odeme), kind: 'minus' as const }] : []),
                { label: 'Net değeriniz', value: formatTL(s.netDeger), kind: 'total' },
              ]}
            />
            {bedelliVar && s.bedelliDahil && (
              <Callout kind={s.kullanilmayanHakDegeri > 0 ? 'warning' : 'info'}>
                Bir paya bağlı rüçhan haklarının referans değeri <strong>{fiyat3(s.rucanReferans)}</strong>.
                {s.kullanilmayanHakDegeri > 0
                  ? ` Kullanmadığınız hakları borsada satmazsanız yaklaşık ${formatTL(s.kullanilmayanHakDegeri)} değer kaybedersiniz.`
                  : ' Haklarınızı kullandığınızda değer kaybı olmaz; yalnızca ödeme yaparak pay sayınızı artırırsınız.'}
              </Callout>
            )}
            {bedelliVar && !s.bedelliDahil && (
              <Callout kind="warning">
                {s.bedelliHaricNedeni === 'kapanis-dusuk'
                  ? 'Kapanış fiyatı rüçhan kullanma fiyatının altında olduğu için'
                  : 'Temettü ve bedelsiz sonrası fiyat rüçhan kullanma fiyatının altına düştüğü için'}{' '}
                Borsa İstanbul kuralı gereği bedelli artırım teorik fiyata dahil edilmez (rüçhan oranı 0 kabul edilir).
              </Callout>
            )}
            {s.bedelsizYeniLot % 1 !== 0 && (
              <Callout kind="info">
                Kesirli paylar hesabınıza tam sayı olarak geçmez; kesir haklar aracı kurumunuzun uygulamasına göre birleştirilir
                ya da satılır.
              </Callout>
            )}
            <ShareBar params={{ fiyat: kapanis, bedelsiz, bedelli, rucan: bedelliVar ? rucan : null, temettu: temettu || null, lot }} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için kapanış fiyatını ve en az bir oranı girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
