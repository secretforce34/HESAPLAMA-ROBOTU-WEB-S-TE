import { useMemo, useState } from 'preact/hooks';
import { tufe } from '../../data/series';
import { formatMonthTR, formatPercent, formatTL } from '../../lib/format';
import { NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { altiAy, donemSecenekleri, yeniMaas, zamHesapla, type Statu } from './calc';

const DONEMLER = donemSecenekleri();
const sonUc = tufe.aylar.slice(-3).map((a) => a.aylik);
const VARSAYILAN_TAHMIN = Math.round((sonUc.reduce((t, x) => t + x, 0) / sonUc.length) * 100) / 100;
const STATU_ADI: Record<Statu, string> = { emekli: 'SSK / Bağ-Kur emeklisi', memur: 'Memur', 'memur-emekli': 'Memur emeklisi (Emekli Sandığı)' };

export default function Calculator() {
  const [statu, setStatu] = useState<Statu>('emekli');
  const [donem, setDonem] = useState(DONEMLER.find((d) => d > tufe.sonAy) ?? DONEMLER[DONEMLER.length - 1]);
  const [maas, setMaas] = useState<number | null>(20000);
  const [tahminler, setTahminler] = useState<Record<string, number | null>>({});

  const aylar = altiAy(donem);
  const tahminDegeri = (ay: string) => (ay in tahminler ? tahminler[ay] : VARSAYILAN_TAHMIN);
  const tahminTam: Record<string, number> = {};
  for (const ay of aylar) {
    const v = tahminDegeri(ay);
    if (v !== null && v !== undefined) tahminTam[ay] = v;
  }

  const r = useMemo(() => zamHesapla(donem, statu, tahminTam), [donem, statu, JSON.stringify(tahminTam)]);
  const yeni = r && maas ? yeniMaas(maas, r.zam) : null;

  const ozet = r
    ? [
        `${formatMonthTR(donem)} ${STATU_ADI[statu]} zammı: ${formatPercent(r.zam, 2)}${r.resmi ? '' : ' (tahmini)'}`,
        maas && yeni ? `${formatTL(maas)} → ${formatTL(yeni)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <SelectField
          id="ez-statu"
          label="Durumunuz"
          value={statu}
          onChange={setStatu}
          options={(Object.keys(STATU_ADI) as Statu[]).map((s) => ({ value: s, label: STATU_ADI[s] }))}
        />
        <Segmented
          name="ez-donem"
          label="Zam dönemi"
          value={donem}
          onChange={setDonem}
          options={DONEMLER.map((d) => ({ value: d, label: formatMonthTR(d) }))}
        />
        <NumberField id="ez-maas" label="Şu anki aylık maaşınız" value={maas} onChange={setMaas} suffix="TL" />
        {aylar.some((a) => !tufe.aylar.find((t) => t.ay === a)) && (
          <div class="field">
            <span class="field__label">Henüz açıklanmamış aylar için enflasyon tahmininiz</span>
            <div class="row-2">
              {aylar
                .filter((a) => !tufe.aylar.find((t) => t.ay === a))
                .map((a) => (
                  <NumberField
                    key={a}
                    id={`ez-t-${a}`}
                    label={formatMonthTR(a)}
                    value={tahminDegeri(a) ?? null}
                    onChange={(v) => setTahminler((t) => ({ ...t, [a]: v }))}
                    suffix="%"
                  />
                ))}
            </div>
            <p class="field__hint">Başlangıç değeri son 3 ayın ortalaması (%{VARSAYILAN_TAHMIN.toLocaleString('tr-TR')}); kendi tahmininizi yazabilirsiniz.</p>
          </div>
        )}
      </div>

      <div class="calc-results">
        {r ? (
          <>
            <ResultHero
              label={`${formatMonthTR(donem)} ${r.resmi ? 'zammı' : 'tahmini zam'}`}
              value={formatPercent(r.zam, 2)}
              sub={yeni !== null ? <>Yeni maaş <strong>{formatTL(yeni)}</strong> · artış {formatTL(yeni - maas!)}</> : undefined}
            />
            <Breakdown
              rows={[
                { label: '6 aylık enflasyon (TÜFE)', value: formatPercent(r.altiAylikTufe, 2), hint: `${formatMonthTR(aylar[0])} – ${formatMonthTR(aylar[5])}` },
                ...(r.toplusozlesme !== null
                  ? [
                      { label: 'Önceki dönemden enflasyon farkı', value: formatPercent(r.enflasyonFarki!, 2) },
                      { label: 'Toplu sözleşme artışı', value: formatPercent(r.toplusozlesme, 2) },
                    ]
                  : []),
                { label: 'Toplam zam', value: formatPercent(r.zam, 2), kind: 'total' as const },
              ]}
            />
            {!r.resmi && (
              <Callout kind="warning">
                Bu bir tahmindir: {r.tahminAySayisi} ayın enflasyonu henüz açıklanmadı. Kesin oran, TÜİK’in son ay verisini açıklamasıyla
                (genellikle {formatMonthTR(donem)}’nın 3’ünde) belli olur.
              </Callout>
            )}
            <DataTable
              caption="Esas alınan aylar"
              columns={[
                { key: 'a', label: 'Ay' },
                { key: 'o', label: 'Aylık TÜFE' },
                { key: 'd', label: 'Durum' },
              ]}
              rows={r.aylar.map((a) => ({ a: formatMonthTR(a.ay), o: formatPercent(a.oran, 2), d: a.aciklandi ? 'TÜİK' : 'tahmin' }))}
            />
            {statu === 'emekli' && (
              <Callout kind="info">En düşük emekli aylığı yasa ile ayrıca belirlenir; düşük aylıklar zamdan sonra bu tutara tamamlanabilir.</Callout>
            )}
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Tahmin alanlarını doldurun.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
