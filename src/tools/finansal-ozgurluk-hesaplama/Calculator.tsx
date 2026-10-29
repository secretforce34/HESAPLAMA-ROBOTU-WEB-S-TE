import { useMemo, useState } from 'preact/hooks';
import { formatNumber, formatTL } from '../../lib/format';
import { NumberField } from '../../ui/fields';
import { LineChart } from '../../ui/LineChart';
import { Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { hesaplaOzgurluk, validateOzgurluk } from './calc';

const sure = (ay: number) => (ay === 0 ? 'şimdi' : `${Math.floor(ay / 12)} yıl ${ay % 12} ay`);

export default function Calculator() {
  const [harcama, setHarcama] = useState<number | null>(40000);
  const [birikim, setBirikim] = useState<number | null>(500000);
  const [aylik, setAylik] = useState<number | null>(15000);
  const [getiri, setGetiri] = useState<number | null>(4);
  const [cekim, setCekim] = useState<number | null>(4);
  const [artis, setArtis] = useState<number | null>(0);
  const [yas, setYas] = useState<number | null>(30);

  const errors = validateOzgurluk({ harcama, birikim, aylik, getiri, cekim });
  const r = useMemo(
    () =>
      Object.keys(errors).length === 0
        ? hesaplaOzgurluk({
            aylikHarcama: harcama!,
            mevcutBirikim: birikim!,
            aylikBirikim: aylik!,
            reelGetiri: getiri!,
            cekimOrani: cekim!,
            birikimArtisi: artis ?? 0,
            yas: yas ?? 0,
          })
        : null,
    [harcama, birikim, aylik, getiri, cekim, artis, yas, JSON.stringify(errors)],
  );

  const ozet = r
    ? [`Hedef birikim: ${formatTL(r.hedef, 0)}`, r.ay !== null ? `Süre: ${sure(r.ay)}${r.yasinda ? ` (${r.yasinda} yaşında)` : ''}` : 'Bu varsayımlarla hedefe ulaşılamıyor'].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <NumberField
          id="fo-harcama"
          label="Aylık harcamanız (bugünkü fiyatlarla)"
          value={harcama}
          onChange={setHarcama}
          suffix="TL"
          error={errors.harcama}
          hint="Çalışmayı bıraktığınızda yaşamak için gereken aylık tutar."
        />
        <NumberField id="fo-birikim" label="Şu anki birikiminiz" value={birikim} onChange={setBirikim} suffix="TL" error={errors.birikim} />
        <NumberField id="fo-aylik" label="Her ay biriktirebileceğiniz" value={aylik} onChange={setAylik} suffix="TL" error={errors.aylik} />
        <div class="row-2">
          <NumberField
            id="fo-getiri"
            label="Enflasyon üstü yıllık getiri"
            value={getiri}
            onChange={setGetiri}
            suffix="%"
            error={errors.getiri}
            hint="Örnek değer; reel (enflasyondan arındırılmış) getiri."
          />
          <NumberField
            id="fo-cekim"
            label="Yıllık çekim oranı"
            value={cekim}
            onChange={setCekim}
            suffix="%"
            error={errors.cekim}
            hint="Birikimin her yıl ne kadarını harcayacağınız. Örnek: %4."
          />
        </div>
        <Details summary="Diğer varsayımlar">
          <div class="row-2">
            <NumberField id="fo-artis" label="Birikimin yıllık reel artışı" value={artis} onChange={setArtis} suffix="%" />
            <NumberField id="fo-yas" label="Şu anki yaşınız" value={yas} onChange={setYas} decimals={0} />
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {r ? (
          <>
            <ResultHero
              label="Finansal özgürlüğe kalan süre"
              value={r.ay !== null ? sure(r.ay) : 'Bu varsayımlarla ulaşılamıyor'}
              sub={
                <>
                  Hedef birikim <strong>{formatTL(r.hedef, 0)}</strong>
                  {r.yasinda ? ` · ${r.yasinda} yaşında` : ''}
                </>
              }
            />
            <StatGrid
              items={[
                { label: 'Hedef birikim', value: formatTL(r.hedef, 0) },
                { label: 'Hedefin yüzde kaçı hazır', value: `%${formatNumber(Math.min(100, (birikim! / r.hedef) * 100), 1)}` },
                { label: 'Hiç biriktirmeseniz', value: r.birikimsizAy !== null ? sure(r.birikimsizAy) : '—' },
              ]}
            />
            <LineChart
              label="Yıllara göre birikim"
              xLabels={r.yillar.map((y) => `${y.yil}. yıl`)}
              series={[
                { label: 'Birikim', values: r.yillar.map((y) => y.birikim) },
                { label: 'Hedef', values: r.yillar.map(() => r.hedef), color: 'var(--c2)' },
              ]}
              formatY={(n) => formatTL(n, 0)}
            />
            <Details summary="Yıl yıl birikim tablosu">
              <DataTable
                scroll
                columns={[
                  { key: 'y', label: 'Yıl' },
                  { key: 'b', label: 'Birikim' },
                  { key: 'g', label: 'Sağlayacağı aylık gelir' },
                  { key: 'o', label: 'Hedefe oran' },
                ]}
                rows={r.yillar.map((y) => ({
                  y: yas ? `${y.yil}. yıl (${yas + y.yil} yaş)` : `${y.yil}. yıl`,
                  b: formatTL(y.birikim, 0),
                  g: formatTL(y.aylikGelir, 0),
                  o: `%${formatNumber(Math.min(100, (y.birikim / r.hedef) * 100), 0)}`,
                }))}
              />
            </Details>
            <Callout kind="info">
              Hesap bugünkü parayla yapılır: getiri enflasyon üstü getiridir, hedef de bugünkü fiyatlarla ifade edilir. Gerçek
              getiriler yıldan yıla dalgalanır; bu bir planlama aracıdır, yatırım tavsiyesi değildir.
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
