import { useMemo, useRef, useState } from 'preact/hooks';
import { formatMonthTR, formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, Segmented, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { gelirKarsilastir, kisiselEnflasyon, onceTutar, resmi, validateKalemler } from './calc';

type Giris = 'tutar' | 'oran';

interface Satir {
  id: number;
  ad: string;
  simdi: number | null;
  once: number | null;
  artis: number | null;
}

const VARSAYILAN: [string, number, number][] = [
  ['Kira', 22_000, 16_000],
  ['Market ve gıda', 14_000, 10_500],
  ['Elektrik, su, doğalgaz', 3_500, 2_600],
  ['Ulaşım (yakıt, toplu taşıma)', 4_500, 3_400],
  ['Dışarıda yemek', 3_000, 2_200],
  ['Telefon ve internet', 1_200, 900],
  ['Giyim', 2_000, 1_700],
  ['Diğer', 4_000, 3_000],
];

const silIkon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
  </svg>
);

const artisHesapla = (s: Satir) => (s.simdi !== null && s.once ? Math.round((s.simdi / s.once - 1) * 1000) / 10 : null);

export default function Calculator() {
  const sayac = useRef(100);
  const [giris, setGiris] = useState<Giris>('tutar');
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    VARSAYILAN.map(([ad, simdi, once], i) => {
      const s: Satir = { id: i + 1, ad, simdi, once, artis: null };
      return { ...s, artis: artisHesapla(s) };
    }),
  );
  const [gelirOnce, setGelirOnce] = useState<number | null>(null);
  const [gelirSimdi, setGelirSimdi] = useState<number | null>(null);

  const guncelle = (id: number, alan: Partial<Satir>) => setSatirlar((l) => l.map((x) => (x.id === id ? { ...x, ...alan } : x)));

  const girisDegistir = (g: Giris) => {
    // Diğer kipin alanını mevcut değerlerden doldur ki geçişte veri kaybolmasın
    setSatirlar((l) =>
      l.map((s) =>
        g === 'oran'
          ? { ...s, artis: artisHesapla(s) }
          : { ...s, once: s.simdi !== null && s.artis !== null && s.artis > -100 ? Math.round(onceTutar(s.simdi, s.artis)) : s.once },
      ),
    );
    setGiris(g);
  };

  const etkin = satirlar.map((s) => ({
    ad: s.ad.trim() || 'Kalem',
    simdi: s.simdi,
    once: giris === 'tutar' ? s.once : s.simdi !== null && s.artis !== null && s.artis > -100 ? onceTutar(s.simdi, s.artis) : null,
  }));
  const hata = validateKalemler(etkin);
  const r = useMemo(
    () => (hata ? null : kisiselEnflasyon(etkin.filter((k) => k.simdi !== null).map((k) => ({ ad: k.ad, simdi: k.simdi!, once: k.once! })))),
    [JSON.stringify(etkin), hata],
  );
  const gelir = r && gelirOnce && gelirOnce > 0 && gelirSimdi !== null ? gelirKarsilastir(gelirOnce, gelirSimdi, r.oran) : null;
  const fark = r ? r.oran - resmi.yillik : 0;

  const ozet = r
    ? [
        `Kişisel enflasyonum: ${formatPercent(r.oran, 1)}`,
        `Resmi yıllık TÜFE (${formatMonthTR(resmi.ay)}): ${formatPercent(resmi.yillik, 2)}`,
        `Aylık harcama: ${formatTL(r.toplamOnce, 0)} → ${formatTL(r.toplamSimdi, 0)}`,
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="ke-giris"
          label="Nasıl gireceksiniz?"
          value={giris}
          onChange={girisDegistir}
          options={[
            { value: 'tutar', label: 'Geçen yıl ve bugün ödediğim' },
            { value: 'oran', label: 'Bugün ödediğim ve artış %' },
          ]}
          hint="Aynı şeyleri aynı miktarda aldığınızı düşünün; daha çok ya da daha az tüketim enflasyon değildir."
        />
        <div class="field">
          <span class="field__label">Aylık harcamalarınız</span>
          <ul class="line-items">
            {satirlar.map((s, i) => (
              <li class="line-item" key={s.id}>
                <div class="line-item__head">
                  <span>Kalem {i + 1}</span>
                  {satirlar.length > 1 && (
                    <button
                      type="button"
                      class="line-item__remove"
                      aria-label={`${s.ad || `Kalem ${i + 1}`} kalemini sil`}
                      onClick={() => setSatirlar((l) => l.filter((x) => x.id !== s.id))}
                    >
                      {silIkon}
                    </button>
                  )}
                </div>
                <TextField id={`kie-ad-${s.id}`} label="Harcama" value={s.ad} onChange={(v) => guncelle(s.id, { ad: v })} />
                <div class="line-item__fields">
                  <NumberField id={`kie-simdi-${s.id}`} label="Bugün aylık" value={s.simdi} onChange={(v) => guncelle(s.id, { simdi: v })} suffix="TL" />
                  {giris === 'tutar' ? (
                    <NumberField id={`kie-once-${s.id}`} label="1 yıl önce aylık" value={s.once} onChange={(v) => guncelle(s.id, { once: v })} suffix="TL" />
                  ) : (
                    <NumberField id={`kie-artis-${s.id}`} label="Fiyat artışı" value={s.artis} onChange={(v) => guncelle(s.id, { artis: v })} suffix="%" />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {hata && <p class="field__error">{hata}</p>}
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() => setSatirlar((l) => [...l, { id: sayac.current++, ad: '', simdi: null, once: null, artis: null }])}
          >
            + Harcama ekle
          </button>
        </div>
        <Details summary="Gelirim enflasyona yetişti mi?">
          <div class="row-2">
            <NumberField id="kie-gelir-once" label="1 yıl önceki aylık gelir" value={gelirOnce} onChange={setGelirOnce} suffix="TL" />
            <NumberField id="kie-gelir-simdi" label="Bugünkü aylık gelir" value={gelirSimdi} onChange={setGelirSimdi} suffix="TL" />
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {r ? (
          <>
            <ResultHero
              label="Kişisel yıllık enflasyonunuz"
              value={formatPercent(r.oran, 1)}
              sub={
                <>
                  Resmi yıllık TÜFE ({formatMonthTR(resmi.ay)}) <strong>{formatPercent(resmi.yillik, 2)}</strong> · fark{' '}
                  {fark >= 0 ? '+' : '−'}
                  {formatNumber(Math.abs(fark), 1)} puan
                </>
              }
            />
            <StatGrid
              items={[
                { label: '1 yıl önce aylık harcama', value: formatTL(r.toplamOnce, 0) },
                { label: 'Bugün aynı harcama', value: formatTL(r.toplamSimdi, 0) },
                { label: 'Aylık ek yük', value: formatTL(r.toplamSimdi - r.toplamOnce, 0) },
              ]}
            />
            {gelir && (
              <Breakdown
                title="Geliriniz"
                rows={[
                  { label: 'Gelir artışı', value: formatPercent(gelir.nominalArtis, 1) },
                  { label: 'Alım gücünü korumak için gereken gelir', value: formatTL(gelir.gereken, 0) },
                  {
                    label: gelir.reelDegisim >= 0 ? 'Alım gücünüz arttı' : 'Alım gücünüz azaldı',
                    value: formatPercent(Math.abs(gelir.reelDegisim), 1),
                    kind: gelir.reelDegisim >= 0 ? ('plus' as const) : ('minus' as const),
                  },
                ]}
              />
            )}
            <DataTable
              caption="Enflasyonunuzu en çok etkileyen harcamalar"
              columns={[
                { key: 'a', label: 'Harcama' },
                { key: 'p', label: 'Bütçedeki payı' },
                { key: 'r', label: 'Fiyat artışı' },
                { key: 'k', label: 'Enflasyona katkısı' },
              ]}
              rows={[...r.kalemler]
                .sort((a, b) => b.katki - a.katki)
                .map((k) => ({
                  a: k.ad,
                  p: formatPercent(k.pay, 1),
                  r: formatPercent(k.artis, 1),
                  k: `${formatNumber(k.katki, 1)} puan`,
                }))}
              foot={{ a: 'Toplam', p: '%100', r: formatPercent(r.oran, 1), k: `${formatNumber(r.oran, 1)} puan` }}
            />
            <Callout kind="info">
              TÜİK, Türkiye ortalamasındaki bir hanenin harcama sepetini ölçer. Kirada oturanlarda, büyükşehirlerde ya da bütçesinin büyük
              kısmı gıdaya gidenlerde kişisel enflasyon resmi rakamdan belirgin biçimde farklı olabilir.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için harcamalarınızı girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
