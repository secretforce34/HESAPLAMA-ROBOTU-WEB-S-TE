import { useMemo, useState } from 'preact/hooks';
import { formatMonthTR, formatNumber, formatPercent, formatTL } from '../../lib/format';
import { MonthField, NumberField, Segmented } from '../../ui/fields';
import { LineChart } from '../../ui/LineChart';
import { Callout, DataTable, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { ayListesi, degerSerisi, enflasyonSerisi, ILK_AY, karsilastir, SON_AY, VARLIK_ADI, type Mod, type Varlik } from './calc';

const BIRIM: Record<Varlik, string> = { tl: 'TL', usd: '$', eur: '€', altin: 'gram' };
const RENK: Record<Varlik, string> = { tl: 'var(--c4)', usd: 'var(--c1)', eur: 'var(--c3)', altin: 'var(--c2)' };

export default function Calculator() {
  const [tutar, setTutar] = useState<number | null>(10000);
  const [baslangic, setBaslangic] = useState('2015-01');
  const [bitis, setBitis] = useState(SON_AY);
  const [mod, setMod] = useState<Mod>('tek');

  const hata = tutar === null || tutar <= 0 ? 'Bir tutar girin.' : baslangic >= bitis ? 'Başlangıç ayı bitişten önce olmalı.' : null;
  const r = useMemo(() => (hata ? null : karsilastir(tutar!, baslangic, bitis, mod)), [hata, tutar, baslangic, bitis, mod]);
  const enIyi = r?.sonuclar[0];

  const grafik = useMemo(() => {
    if (!r || mod !== 'tek') return null;
    const aylar = ayListesi(baslangic, bitis);
    return {
      x: aylar.map((a) => formatMonthTR(a)),
      seri: [
        ...(['altin', 'usd', 'eur', 'tl'] as Varlik[]).map((v) => ({ label: VARLIK_ADI[v], values: degerSerisi(tutar!, baslangic, bitis, v), color: RENK[v] })),
        { label: 'Enflasyon (alım gücünü korumak için)', values: enflasyonSerisi(tutar!, baslangic, bitis), color: 'var(--text-3)' },
      ],
    };
  }, [r, mod, tutar, baslangic, bitis]);

  const ozet = r
    ? [
        `${formatTL(tutar!, 0)} ${mod === 'tek' ? `${formatMonthTR(baslangic)}’da` : `her ay (${formatMonthTR(baslangic)}–${formatMonthTR(bitis)})`} alınsaydı, ${formatMonthTR(bitis)} değeri:`,
        ...r.sonuclar.map((s) => `${VARLIK_ADI[s.varlik]}: ${formatTL(s.deger, 0)} (reel ${formatPercent(s.reelGetiri, 1)})`),
        'Geçmiş getiriler geleceğin göstergesi değildir.',
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="yo-mod"
          label="Nasıl alınsaydı?"
          value={mod}
          onChange={setMod}
          options={[
            { value: 'tek', label: 'Bir kerede' },
            { value: 'duzenli', label: 'Her ay düzenli' },
          ]}
        />
        <NumberField
          id="yo-tutar"
          label={mod === 'tek' ? 'Tutar' : 'Her ay'}
          value={tutar}
          onChange={setTutar}
          suffix="TL"
          error={tutar === null || tutar <= 0 ? hata : null}
        />
        <MonthField
          id="yo-bas"
          label={mod === 'tek' ? 'Hangi ay alınsaydı?' : 'Başlangıç ayı'}
          value={baslangic}
          onChange={setBaslangic}
          min={ILK_AY}
          max={SON_AY}
          error={baslangic >= bitis ? hata : null}
        />
        <MonthField id="yo-bit" label="Bugün yerine hangi aya göre?" value={bitis} onChange={setBitis} min={ILK_AY} max={SON_AY} hint={`Son veri: ${formatMonthTR(SON_AY)}`} />
      </div>

      <div class="calc-results">
        {r && enIyi ? (
          <>
            <ResultHero
              label={`En çok değerlenen: ${VARLIK_ADI[enIyi.varlik]}`}
              value={formatTL(enIyi.deger, 0)}
              sub={
                <>
                  {formatTL(enIyi.yatirilan, 0)} yatırım · reel getiri <strong>{formatPercent(enIyi.reelGetiri, 1)}</strong>
                </>
              }
            />
            <DataTable
              caption={`${formatMonthTR(bitis)} değerleri`}
              columns={[
                { key: 'v', label: 'Varlık' },
                { key: 'b', label: 'Alınan' },
                { key: 'd', label: 'Bugünkü değer' },
                { key: 'n', label: 'Nominal' },
                { key: 'r', label: 'Reel (enflasyon sonrası)' },
              ]}
              rows={r.sonuclar.map((s) => ({
                v: VARLIK_ADI[s.varlik],
                b: s.varlik === 'tl' ? '–' : `${formatNumber(s.birim, 2)} ${BIRIM[s.varlik]}`,
                d: formatTL(s.deger, 0),
                n: formatPercent(s.nominalGetiri, 1),
                r: formatPercent(s.reelGetiri, 1),
              }))}
            />
            <Callout kind="info">
              Aynı alım gücünü korumak için {formatMonthTR(bitis)} itibarıyla {formatTL(r.enflasyonKarsiligi, 0)} gerekirdi. Reel getirisi
              eksi olan seçenek, enflasyonun gerisinde kalmıştır.
            </Callout>
            {grafik && (
              <LineChart
                label="Yatırımın aylara göre değeri"
                xLabels={grafik.x}
                series={grafik.seri}
                formatY={(n) => formatTL(n, 0)}
              />
            )}
            <Callout kind="warning">
              Geçmiş getiriler geleceğin göstergesi değildir. Bu hesaplama yatırım tavsiyesi değildir. Kur ve altın değerleri ay sonu
              verileridir; alış-satış farkı, komisyon ve vergiler dahil değildir.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>{hata ?? 'Bu aralık için veri bulunamadı.'}</ResultEmpty>
        )}
      </div>
    </div>
  );
}
