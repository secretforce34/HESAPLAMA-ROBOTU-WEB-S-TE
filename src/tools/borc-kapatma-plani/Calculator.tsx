import { useMemo, useRef, useState } from 'preact/hooks';
import { asgariOdemeDonemiOn, kartFaizDonemiOn } from '../../data/params/kredi';
import { todayIsoTR } from '../../lib/finance';
import { formatNumber, formatTL } from '../../lib/format';
import { NumberField, Segmented, SelectField, TextField } from '../../ui/fields';
import { LineChart } from '../../ui/LineChart';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { borcFaizi, krediyleKapat, planla, validateBorclar, type Borc, type BorcTuru, type PlanSonucu, type Strateji } from './calc';

interface Satir {
  id: number;
  ad: string;
  tur: BorcTuru;
  bakiye: number | null;
  limit: number | null;
  faiz: number | null;
}

const TURLER: { value: BorcTuru; label: string }[] = [
  { value: 'kart', label: 'Kredi kartı (alışveriş)' },
  { value: 'nakit', label: 'Kredi kartı (nakit avans)' },
  { value: 'kmh', label: 'Kredili mevduat (KMH, eksi hesap)' },
];

/** hepsi: kart + KMH birlikte; kart: yalnız kredi kartları; kmh: yalnız kredili mevduat hesapları */
export type Mod = 'hepsi' | 'kart' | 'kmh';

const VARSAYILAN: Record<Mod, Omit<Satir, 'id'>[]> = {
  hepsi: [
    { ad: '1. kart', tur: 'kart', bakiye: 45_000, limit: 60_000, faiz: null },
    { ad: '2. kart', tur: 'kart', bakiye: 12_000, limit: 30_000, faiz: null },
    { ad: 'Eksi hesap', tur: 'kmh', bakiye: 20_000, limit: null, faiz: null },
  ],
  kart: [
    { ad: '1. kart', tur: 'kart', bakiye: 45_000, limit: 60_000, faiz: null },
    { ad: '2. kart', tur: 'kart', bakiye: 12_000, limit: 30_000, faiz: null },
  ],
  kmh: [
    { ad: '1. banka KMH', tur: 'kmh', bakiye: 30_000, limit: null, faiz: null },
    { ad: '2. banka KMH', tur: 'kmh', bakiye: 10_000, limit: null, faiz: null },
  ],
};

const METIN: Record<Mod, { baslik: string; ekle: string; yeniAd: (n: number) => string; butce: number }> = {
  hepsi: { baslik: 'Borçlarınız', ekle: '+ Borç ekle', yeniAd: (n) => `${n}. kart`, butce: 15_000 },
  kart: { baslik: 'Kredi kartlarınız', ekle: '+ Kart ekle', yeniAd: (n) => `${n}. kart`, butce: 12_000 },
  kmh: { baslik: 'KMH (eksi hesap) borçlarınız', ekle: '+ KMH ekle', yeniAd: (n) => `${n}. banka KMH`, butce: 8_000 },
};

const STRATEJI_ADI: Record<Strateji, string> = {
  cig: 'Çığ yöntemi (en yüksek faiz önce)',
  kartopu: 'Kartopu yöntemi (en küçük borç önce)',
  asgari: 'Yalnızca asgari ödeme',
};

const silIkon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
  </svg>
);

const sure = (ay: number) => (ay < 12 ? `${ay} ay` : ay % 12 === 0 ? `${ay / 12} yıl` : `${Math.floor(ay / 12)} yıl ${ay % 12} ay`);
const sureMetni = (p: PlanSonucu) => (p.bitmedi ? 'Bitmiyor' : sure(p.ay));

export default function Calculator({ mod = 'hepsi' }: { mod?: Mod }) {
  const sayac = useRef(100);
  const metin = METIN[mod];
  const turler = mod === 'kart' ? TURLER.filter((t) => t.value !== 'kmh') : TURLER;
  const ortam = useMemo(() => {
    const bugun = todayIsoTR();
    return { faizDonemi: kartFaizDonemiOn(bugun), asgariDonemi: asgariOdemeDonemiOn(bugun) };
  }, []);
  const [satirlar, setSatirlar] = useState<Satir[]>(() => VARSAYILAN[mod].map((s, i) => ({ ...s, id: i + 1 })));
  const [butce, setButce] = useState<number | null>(metin.butce);
  const [strateji, setStrateji] = useState<Exclude<Strateji, 'asgari'>>('cig');
  const [krediFaiz, setKrediFaiz] = useState<number | null>(null);
  const [krediVade, setKrediVade] = useState<number | null>(24);
  const [tahsis, setTahsis] = useState<number | null>(0);

  const guncelle = (id: number, alan: Partial<Satir>) => setSatirlar((l) => l.map((x) => (x.id === id ? { ...x, ...alan } : x)));

  const hata = validateBorclar(satirlar.map((s) => ({ bakiye: s.bakiye, aylikFaiz: s.faiz, limit: s.limit, tur: s.tur })));
  const butceHata = butce === null || butce <= 0 ? 'Her ay ayırabileceğiniz tutarı girin.' : null;
  const borclar: Borc[] = satirlar
    .filter((s) => (s.bakiye ?? 0) > 0)
    .map((s, i) => ({ ad: s.ad.trim() || `${i + 1}. borç`, tur: s.tur, bakiye: s.bakiye!, aylikFaiz: s.faiz, limit: s.limit ?? 0 }));

  const sonuc = useMemo(() => {
    if (hata || butceHata) return null;
    return {
      cig: planla(borclar, butce!, 'cig', ortam),
      kartopu: planla(borclar, butce!, 'kartopu', ortam),
      asgari: planla(borclar, 0, 'asgari', ortam),
    };
  }, [JSON.stringify(borclar), butce, hata, butceHata]);

  const toplamBorc = borclar.reduce((t, b) => t + b.bakiye, 0);
  const kredi =
    sonuc && krediFaiz !== null && krediFaiz > 0 && krediVade !== null && krediVade >= 1 && Number.isInteger(krediVade)
      ? krediyleKapat(toplamBorc, krediFaiz, krediVade, tahsis ?? 0)
      : null;

  const secili = sonuc?.[strateji];
  const ozet =
    sonuc && secili && !secili.yetersiz
      ? [
          `Toplam borç: ${formatTL(toplamBorc, 0)}, aylık bütçe: ${formatTL(butce!, 0)}`,
          `${STRATEJI_ADI[strateji]}: ${sureMetni(secili)}, faiz ve vergi ${formatTL(secili.toplamFaiz, 0)}`,
          `Yalnızca asgari ödeme: ${sureMetni(sonuc.asgari)}, faiz ve vergi ${formatTL(sonuc.asgari.toplamFaiz, 0)}`,
        ].join('\n')
      : '';

  const grafikAy = secili && sonuc ? Math.min(Math.max(secili.ay, sonuc.asgari.ay), 600) : 0;
  const seri = (p: PlanSonucu) => Array.from({ length: grafikAy + 1 }, (_, i) => (i === 0 ? toplamBorc : (p.aylar[i - 1]?.kalan ?? 0)));

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <div class="field">
          <span class="field__label">{metin.baslik}</span>
          <ul class="line-items">
            {satirlar.map((s, i) => {
              const otomatik = (s.bakiye ?? 0) > 0 ? borcFaizi({ ad: '', tur: s.tur, bakiye: s.bakiye!, aylikFaiz: null, limit: 0 }, s.bakiye!, ortam) : null;
              return (
                <li class="line-item" key={s.id}>
                  <div class="line-item__head">
                    <span>{i + 1}. borç</span>
                    {satirlar.length > 1 && (
                      <button type="button" class="line-item__remove" aria-label={`${s.ad || `${i + 1}. borç`} satırını sil`} onClick={() => setSatirlar((l) => l.filter((x) => x.id !== s.id))}>
                        {silIkon}
                      </button>
                    )}
                  </div>
                  <div class="line-item__fields">
                    <TextField id={`bk-ad-${s.id}`} label="Adı" value={s.ad} onChange={(v) => guncelle(s.id, { ad: v })} />
                    {mod !== 'kmh' && (
                      <SelectField id={`bk-tur-${s.id}`} label="Türü" value={s.tur} options={turler} onChange={(v) => guncelle(s.id, { tur: v })} />
                    )}
                    <NumberField id={`bk-bakiye-${s.id}`} label="Borç (son ekstre)" value={s.bakiye} onChange={(v) => guncelle(s.id, { bakiye: v })} suffix="TL" />
                    {s.tur !== 'kmh' && (
                      <NumberField id={`bk-limit-${s.id}`} label="Kart limiti" value={s.limit} onChange={(v) => guncelle(s.id, { limit: v })} suffix="TL" />
                    )}
                    <NumberField
                      id={`bk-faiz-${s.id}`}
                      label="Aylık faiz"
                      value={s.faiz}
                      onChange={(v) => guncelle(s.id, { faiz: v })}
                      suffix="%"
                      placeholder={otomatik !== null ? formatNumber(otomatik, 2) : ''}
                      hint={s.faiz === null ? 'Boşsa TCMB azami oranı' : undefined}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {hata && <p class="field__error">{hata}</p>}
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() =>
              setSatirlar((l) => [
                ...l,
                { id: sayac.current++, ad: metin.yeniAd(l.length + 1), tur: mod === 'kmh' ? 'kmh' : 'kart', bakiye: null, limit: null, faiz: null },
              ])
            }
          >
            {metin.ekle}
          </button>
        </div>
        <NumberField
          id="bk-butce"
          label="Borçlara her ay ayırabileceğiniz toplam"
          value={butce}
          onChange={setButce}
          suffix="TL"
          error={butceHata}
          hint="Yeni harcama yapmadığınız varsayılır."
        />
        <Segmented
          name="bk-strateji"
          label="Artan para hangi borca gitsin?"
          value={strateji}
          onChange={setStrateji}
          options={[
            { value: 'cig', label: 'En yüksek faizliye (çığ)' },
            { value: 'kartopu', label: 'En küçük borca (kartopu)' },
          ]}
        />
        <Details summary="İhtiyaç kredisiyle kapatsam?">
          <div class="row-2">
            <NumberField
              id="bk-kredi-faiz"
              label="Kredinin aylık faizi"
              value={krediFaiz}
              onChange={setKrediFaiz}
              suffix="%"
              hint="Bankanın teklifini yazın; KKDF ve BSMV eklenir."
            />
            <NumberField id="bk-kredi-vade" label="Vade" value={krediVade} onChange={setKrediVade} suffix="ay" decimals={0} />
          </div>
          <NumberField id="bk-tahsis" label="Tahsis ücreti ve diğer masraflar" value={tahsis} onChange={setTahsis} suffix="TL" />
        </Details>
      </div>

      <div class="calc-results">
        {sonuc && secili ? (
          secili.yetersiz ? (
            mod === 'kmh' ? (
              <Callout kind="danger">
                Bütçeniz bu ay işleyecek faiz ve vergiyi ({formatTL(secili.ilkAsgariToplam)}) bile karşılamıyor; bu durumda borç her ay büyür. Bütçeyi
                artırın ya da bankanızla borcu taksitli krediye çevirmeyi konuşun.
              </Callout>
            ) : (
              <Callout kind="danger">
                Bütçeniz bu ayki asgari ödemelerin toplamını ({formatTL(secili.ilkAsgariToplam)}) karşılamıyor. Asgari tutar ödenmezse gecikme faizi
                işler; bir yılda üç kez ödenmeyen kart nakit kullanımına kapatılır. Bütçeyi artırın ya da bankanızla yapılandırma konuşun.
              </Callout>
            )
          ) : (
            <>
              <ResultHero
                label="Borçlarınızın bitmesine kalan süre"
                value={sureMetni(secili)}
                sub={
                  <>
                    Faiz ve vergi <strong>{formatTL(secili.toplamFaiz, 0)}</strong> · toplam ödeme {formatTL(secili.toplamOdeme, 0)}
                  </>
                }
              />
              {!sonuc.asgari.bitmedi && sonuc.asgari.toplamFaiz > secili.toplamFaiz && (
                <Callout kind="success">
                  Yalnızca asgari ödemeye göre {formatTL(sonuc.asgari.toplamFaiz - secili.toplamFaiz, 0)} faiz ve vergiden kurtulur, borcu{' '}
                  {sure(sonuc.asgari.ay - secili.ay)} erken bitirirsiniz.
                </Callout>
              )}
              <DataTable
                caption="Yöntemlerin karşılaştırması"
                columns={[
                  { key: 'y', label: 'Yöntem' },
                  { key: 's', label: 'Süre' },
                  { key: 'f', label: 'Faiz + KKDF + BSMV' },
                  { key: 't', label: 'Toplam ödeme' },
                ]}
                rows={[
                  ...(['cig', 'kartopu', 'asgari'] as const).map((k) => ({
                    y: STRATEJI_ADI[k],
                    s: sureMetni(sonuc[k]),
                    f: sonuc[k].bitmedi ? 'Borç bitmiyor' : formatTL(sonuc[k].toplamFaiz, 0),
                    t: sonuc[k].bitmedi ? '—' : formatTL(sonuc[k].toplamOdeme, 0),
                  })),
                  ...(kredi
                    ? [
                        {
                          y: `İhtiyaç kredisi (${krediVade} ay, taksit ${formatTL(kredi.taksit, 0)})`,
                          s: sure(krediVade!),
                          f: formatTL(kredi.toplamMaliyet, 0),
                          t: formatTL(kredi.toplamOdeme, 0),
                        },
                      ]
                    : []),
                ]}
              />
              {kredi && kredi.vadeAsiyor && (
                <Callout kind="warning">
                  BDDK sınırı: {formatTL(toplamBorc, 0)} tutarındaki ihtiyaç kredisi en fazla {kredi.azamiVade} ay vadeli olabilir.
                </Callout>
              )}
              {kredi && kredi.taksit > butce! && (
                <Callout kind="warning">Kredi taksiti ({formatTL(kredi.taksit, 0)}) aylık bütçenizi aşıyor.</Callout>
              )}
              <Breakdown
                title="Borçların kapanma sırası"
                rows={[...secili.kapanislar]
                  .sort((a, b) => (a.ay ?? Infinity) - (b.ay ?? Infinity))
                  .map((k) => ({ label: k.ad, value: k.ay === null ? 'Bitmiyor' : `${k.ay}. ayda kapanır` }))}
              />
              <LineChart
                label="Aylara göre kalan toplam borç"
                xLabels={Array.from({ length: grafikAy + 1 }, (_, i) => `${i}. ay`)}
                series={[
                  { label: strateji === 'cig' ? 'Çığ planı' : 'Kartopu planı', values: seri(secili), color: 'var(--c1)' },
                  { label: 'Yalnızca asgari', values: seri(sonuc.asgari), color: 'var(--c4)' },
                ]}
                formatY={(n) => formatTL(n, 0)}
              />
              <Details summary="Ay ay ödeme planı">
                <DataTable
                  scroll
                  columns={[
                    { key: 'a', label: 'Ay' },
                    { key: 'o', label: 'Ödeme' },
                    { key: 'f', label: 'Faiz + vergi' },
                    { key: 'k', label: 'Kalan borç' },
                    { key: 'h', label: 'Fazlası nereye' },
                  ]}
                  rows={secili.aylar.map((a) => ({
                    a: `${a.ay}. ay`,
                    o: formatTL(a.odeme),
                    f: formatTL(a.faiz),
                    k: formatTL(a.kalan),
                    h: a.hedef ?? '—',
                  }))}
                />
              </Details>
              {mod === 'kmh' ? (
                <Callout kind="info">
                  KMH’de yasal asgari ödeme yoktur; banka her ay faizi ve vergisini tahsil eder, yalnızca bu tutar ödenirse ana para hiç azalmaz. Faiz boş
                  bırakılırsa TCMB’nin nakit kullanım için ilan ettiği azami oran kullanılır; faize %15 KKDF ve %15 BSMV eklenir.
                </Callout>
              ) : (
                <Callout kind="info">
                  Çığ yöntemi en az faizi öder; kartopu yöntemi küçük borçları hızla kapatıp motivasyon sağlar. Faiz boş bırakılırsa TCMB’nin ilan
                  ettiği azami oran (alışverişte dönem borcuna göre) kullanılır; faize %15 KKDF ve %15 BSMV eklenir.
                </Callout>
              )}
              <ShareBar params={{}} summary={ozet} />
            </>
          )
        ) : (
          <ResultEmpty>Sonucu görmek için borçlarınızı ve aylık bütçenizi girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
