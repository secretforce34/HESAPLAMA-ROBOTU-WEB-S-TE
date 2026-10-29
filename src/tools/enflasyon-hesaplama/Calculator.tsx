import { useMemo, useRef, useState } from 'preact/hooks';
import { formatMonthTR, formatNumber, formatPercent, formatTL } from '../../lib/format';
import { MonthField, NumberField } from '../../ui/fields';
import { LineChart } from '../../ui/LineChart';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { enflasyonla, ILK_AY, seriAraligi, SON_AY } from './calc';

interface Satir {
  id: number;
  tutar: number | null;
  ay: string;
}

export default function Calculator() {
  const sayac = useRef(2);
  const [satirlar, setSatirlar] = useState<Satir[]>([{ id: 1, tutar: 10000, ay: '2020-01' }]);
  const [hedef, setHedef] = useState(SON_AY);

  const guncelle = (id: number, p: Partial<Satir>) => setSatirlar((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const sonuclar = useMemo(
    () => satirlar.map((s) => (s.tutar !== null && s.tutar >= 0 ? enflasyonla(s.tutar, s.ay, hedef) : null)),
    [satirlar, hedef],
  );
  const ilk = sonuclar[0];
  const ilkSatir = satirlar[0];
  const grafik = useMemo(() => (ilk ? seriAraligi(ilkSatir.ay, hedef) : []), [ilk, ilkSatir.ay, hedef]);

  const ozet = sonuclar
    .map((r, i) =>
      r ? `${formatTL(satirlar[i].tutar!)} (${formatMonthTR(satirlar[i].ay)}) = ${formatTL(r.karsilik)} (${formatMonthTR(hedef)})` : '',
    )
    .filter(Boolean)
    .join('\n');

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <div class="field">
          <span class="field__label">Tutarlar ve ait oldukları ay</span>
          <ul class="line-items">
            {satirlar.map((s, i) => (
              <li class="line-item" key={s.id}>
                <div class="line-item__head">
                  <span>Tutar {i + 1}</span>
                  {satirlar.length > 1 && (
                    <button
                      type="button"
                      class="line-item__remove"
                      aria-label={`Tutar ${i + 1}’i sil`}
                      onClick={() => setSatirlar((l) => l.filter((x) => x.id !== s.id))}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
                <NumberField id={`en-tutar-${s.id}`} label="Tutar" value={s.tutar} onChange={(v) => guncelle(s.id, { tutar: v })} suffix="TL" />
                <MonthField id={`en-ay-${s.id}`} label="Hangi ayın parası?" value={s.ay} onChange={(v) => guncelle(s.id, { ay: v })} min={ILK_AY} max={SON_AY} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() => setSatirlar((l) => [...l, { id: sayac.current++, tutar: null, ay: '2015-01' }])}
          >
            + Tutar ekle
          </button>
          <p class="field__hint">Örneğin farklı yıllardaki maaşlarınızı ekleyip bugünkü değerleriyle karşılaştırabilirsiniz.</p>
        </div>
        <MonthField
          id="en-hedef"
          label="Hangi aya göre hesaplansın?"
          value={hedef}
          onChange={setHedef}
          min={ILK_AY}
          max={SON_AY}
          hint={`TÜİK’in açıkladığı son veri: ${formatMonthTR(SON_AY)}. Geçmiş bir ay seçerseniz ters yönde hesaplanır.`}
        />
      </div>

      <div class="calc-results">
        {ilk ? (
          <>
            <ResultHero
              label={`${formatMonthTR(ilkSatir.ay)} tarihindeki ${formatTL(ilkSatir.tutar!, 0)}, ${formatMonthTR(hedef)} itibarıyla`}
              value={formatTL(ilk.karsilik)}
              sub={
                <>
                  Fiyatlar <strong>{formatNumber(ilk.kat, 2)} katına</strong> çıktı · toplam enflasyon {formatPercent(ilk.kumulatif, 1)}
                </>
              }
            />
            <Breakdown
              rows={[
                { label: 'Toplam fiyat artışı', value: formatPercent(ilk.kumulatif, 2) },
                { label: 'Yıllık ortalama enflasyon', value: formatPercent(ilk.yillikOrtalama, 2), hint: `${ilk.aySayisi} ay, bileşik` },
                { label: 'Paranın kaybettiği alım gücü', value: formatPercent(ilk.alimGucuKaybi, 1), kind: 'minus' },
              ]}
            />
            {grafik.length > 2 && (
              <LineChart
                label={`${formatMonthTR(ilkSatir.ay)} ayındaki 1 TL’nin aylara göre karşılığı`}
                xLabels={grafik.map((g) => formatMonthTR(g.ay))}
                series={[{ label: '1 TL’nin karşılığı', values: grafik.map((g) => g.deger) }]}
                formatY={(n) => `${formatNumber(n, 2)} TL`}
              />
            )}
            {satirlar.length > 1 && (
              <DataTable
                caption={`${formatMonthTR(hedef)} fiyatlarıyla`}
                columns={[
                  { key: 'a', label: 'Ay' },
                  { key: 't', label: 'Tutar' },
                  { key: 'k', label: 'Karşılığı' },
                  { key: 'd', label: 'Değişim' },
                ]}
                rows={satirlar.map((s, i) => ({
                  a: formatMonthTR(s.ay),
                  t: s.tutar !== null ? formatTL(s.tutar, 0) : '–',
                  k: sonuclar[i] ? formatTL(sonuclar[i]!.karsilik) : '–',
                  d: sonuclar[i] ? formatPercent(sonuclar[i]!.kumulatif, 1) : '–',
                }))}
              />
            )}
            <Callout kind="info">
              Hesap, TÜİK’in açıkladığı aylık TÜFE değişimleriyle yapılır ve ay sonu fiyat düzeyini esas alır. Kişisel harcama
              sepetiniz genel endeksten farklı olabilir.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için bir tutar girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
