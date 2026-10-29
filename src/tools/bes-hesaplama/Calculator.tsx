import { useMemo, useState } from 'preact/hooks';
import { besKurallari } from '../../data/params/bes';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField } from '../../ui/fields';
import { LineChart } from '../../ui/LineChart';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { hesaplaBes, validateBes } from './calc';

const p = besKurallari.values;
const aylikSinir = p.yillikUstSinir / 12 / (p.devletKatkisiOrani / 100);

export default function Calculator() {
  const [katki, setKatki] = useState<number | null>(3000);
  const [yil, setYil] = useState<number | null>(10);
  const [yas, setYas] = useState<number | null>(35);
  const [getiri, setGetiri] = useState<number | null>(30);
  const [artis, setArtis] = useState<number | null>(25);
  const [mevcutYil, setMevcutYil] = useState<number | null>(null);
  const [mevcutOdenen, setMevcutOdenen] = useState<number | null>(null);
  const [mevcutBirikim, setMevcutBirikim] = useState<number | null>(null);
  const [mevcutDk, setMevcutDk] = useState<number | null>(null);

  const errors = validateBes({ katki, getiri, yil, yas, mevcutYil, mevcutOdenen, mevcutBirikim });
  const r = useMemo(
    () =>
      Object.keys(errors).length === 0
        ? hesaplaBes({
            aylikKatki: katki!,
            katkiArtisi: artis ?? 0,
            getiri: getiri!,
            yil: yil!,
            yas: yas!,
            mevcutYil: mevcutYil ?? 0,
            mevcutOdenen: mevcutOdenen ?? 0,
            mevcutBirikim: mevcutBirikim ?? mevcutOdenen ?? 0,
            mevcutDk: mevcutDk ?? 0,
          })
        : null,
    [katki, artis, getiri, yil, yas, mevcutYil, mevcutOdenen, mevcutBirikim, mevcutDk, JSON.stringify(errors)],
  );

  const s = r?.son;
  const ozet = s
    ? [
        `${s.yil} yıl sonra ${s.emeklilik ? 'emeklilikte' : 'ayrılınca'} eline geçen: ${formatTL(s.net, 0)}`,
        `Ödenen katkı: ${formatTL(s.odenen, 0)}`,
        `Hak edilen devlet katkısı: ${formatTL(s.hakEdilenDk, 0)} (%${s.dkHakOrani})`,
        `Stopaj: ${formatTL(s.stopaj, 0)}`,
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <NumberField
          id="bes-katki"
          label="Aylık katkı payı"
          value={katki}
          onChange={setKatki}
          suffix="TL"
          error={errors.katki}
          hint={`Devlet katkısı yılda en fazla ${formatTL(p.yillikUstSinir, 0)}; ayda yaklaşık ${formatTL(aylikSinir, 0)} üstündeki katkıya verilmez.`}
        />
        <div class="row-2">
          <NumberField id="bes-yil" label="Kaç yıl ödeyeceksiniz?" value={yil} onChange={setYil} suffix="yıl" decimals={0} error={errors.yil} />
          <NumberField id="bes-yas" label="Bugünkü yaşınız" value={yas} onChange={setYas} decimals={0} error={errors.yas} />
        </div>
        <div class="row-2">
          <NumberField
            id="bes-getiri"
            label="Fonların yıllık net getirisi"
            value={getiri}
            onChange={setGetiri}
            suffix="%"
            error={errors.getiri}
            hint="Örnek değer; fon kesintisi düşülmüş getiri."
          />
          <NumberField
            id="bes-artis"
            label="Katkı payını yılda artırma"
            value={artis}
            onChange={setArtis}
            suffix="%"
            hint="0 yazarsanız hep aynı tutar."
          />
        </div>
        <Details summary="Zaten BES’im var">
          <div class="row-2">
            <NumberField
              id="bes-mevcut-yil"
              label="Sistemde geçen süre"
              value={mevcutYil}
              onChange={setMevcutYil}
              suffix="yıl"
              decimals={1}
              error={errors.mevcutYil}
            />
            <NumberField
              id="bes-mevcut-odenen"
              label="Şimdiye kadar ödediğiniz katkı"
              value={mevcutOdenen}
              onChange={setMevcutOdenen}
              suffix="TL"
              error={errors.mevcutOdenen}
            />
          </div>
          <div class="row-2">
            <NumberField
              id="bes-mevcut-birikim"
              label="Katkı payı birikimi (getiri dahil)"
              value={mevcutBirikim}
              onChange={setMevcutBirikim}
              suffix="TL"
            />
            <NumberField id="bes-mevcut-dk" label="Devlet katkısı birikimi" value={mevcutDk} onChange={setMevcutDk} suffix="TL" />
          </div>
          <p class="field__hint" style={{ margin: 0 }}>
            Bu tutarlar e-Devlet’te veya emeklilik şirketinizin uygulamasında “katkı payı” ve “devlet katkısı” başlıklarıyla görünür.
          </p>
        </Details>
      </div>

      <div class="calc-results">
        {r && s ? (
          <>
            <ResultHero
              label={`${s.yil} yıl sonra ${s.emeklilik ? 'emeklilikte' : 'sistemden ayrılırsanız'} elinize geçen`}
              value={formatTL(s.net, 0)}
              sub={
                <>
                  Ödediğiniz <strong>{formatTL(s.odenen, 0)}</strong> · {s.yas} yaşında
                </>
              }
            />
            <StatGrid
              items={[
                { label: 'Katkı payı birikimi', value: formatTL(s.birikim, 0) },
                { label: 'Devlet katkısı birikimi', value: formatTL(s.dkBirikim, 0) },
                { label: 'Devlet katkısı hakkı', value: formatPercent(s.dkHakOrani, 0) },
              ]}
            />
            {!s.emeklilik && (
              <Callout kind="warning">
                Bu sürede emeklilik hakkı doğmuyor: sistemde {formatNumber(s.sistemYili, 1)} yıl, {s.yas} yaş. Emeklilik için sistemde en az{' '}
                {p.emeklilikYil} yıl ve {p.emeklilikYas} yaş gerekir
                {r.emeklilikIcinYil > 0 ? `; sizin için en az ${formatNumber(r.emeklilikIcinYil, 1)} yıl` : ''}. Emeklilikte devlet katkısının tamamı
                alınır ve stopaj %{p.stopaj.emeklilik}’e düşer.
              </Callout>
            )}
            <Breakdown
              rows={[
                { label: 'Katkı payı birikimi', value: formatTL(s.birikim, 0) },
                { label: 'Bunun getirisi', value: formatTL(s.getiri, 0), kind: 'sub' },
                { label: `Stopaj (getiri × %${s.stopajOrani})`, value: formatTL(s.stopaj, 0), kind: 'minus' },
                {
                  label: `Hak edilen devlet katkısı (%${s.dkHakOrani})`,
                  value: formatTL(s.hakEdilenDk, 0),
                  kind: 'plus',
                  hint: s.dkHakOrani < 100 ? `Kalan ${formatTL(s.dkBirikim - s.hakEdilenDk, 0)} devlete döner` : undefined,
                },
                { label: 'Elinize geçen', value: formatTL(s.net, 0), kind: 'total' },
              ]}
            />
            {r.sinirAsildi && (
              <Callout kind="info">
                Bazı yıllarda devlet katkısı üst sınırına ulaşıldı; sınırın üstündeki katkı paylarına devlet katkısı verilmez. Üst sınırın her
                yıl katkı artışınız kadar arttığı varsayıldı (gerçekte brüt asgari ücrete göre belirlenir).
              </Callout>
            )}
            <LineChart
              label="Yıllara göre ödenen ve elinize geçecek tutar"
              xLabels={r.cikislar.map((c) => `${c.yil}. yıl`)}
              series={[
                { label: 'Ödediğiniz', values: r.cikislar.map((c) => c.odenen), color: 'var(--c3)' },
                { label: 'Elinize geçen', values: r.cikislar.map((c) => c.net), color: 'var(--c1)' },
              ]}
              formatY={(n) => formatTL(n, 0)}
            />
            <Details summary="Hangi yıl çıkarsam ne alırım?">
              <DataTable
                scroll
                columns={[
                  { key: 'y', label: 'Yıl' },
                  { key: 'o', label: 'Ödenen' },
                  { key: 'b', label: 'Birikim' },
                  { key: 'd', label: 'Devlet katkısı' },
                  { key: 's', label: 'Stopaj' },
                  { key: 'n', label: 'Elinize geçen' },
                ]}
                rows={r.cikislar.map((c) => ({
                  y: `${c.yil}. yıl (${c.yas} yaş)${c.emeklilik ? ' · emeklilik' : ''}`,
                  o: formatTL(c.odenen, 0),
                  b: formatTL(c.birikim, 0),
                  d: `${formatTL(c.hakEdilenDk, 0)} (%${c.dkHakOrani})`,
                  s: `${formatTL(c.stopaj, 0)} (%${c.stopajOrani})`,
                  n: formatTL(c.net, 0),
                }))}
              />
            </Details>
            <Callout kind="info">
              Getiri bir varsayımdır; fonların gerçek getirisi yıldan yıla değişir. Emeklilikte birikimin bir kısmını toplu alıp kalanını
              maaş gibi almak (programlı geri ödeme, yıllık gelir sigortası) da mümkündür.
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
