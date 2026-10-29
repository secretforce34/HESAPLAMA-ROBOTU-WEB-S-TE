import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { genelAzamiVade, krediVergileri, type EnerjiSinifi, type KrediTuru } from '../../data/params/kredi';
import { round2 } from '../../lib/finance';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StackedBar, StatGrid, type BreakdownRow } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import {
  aylikFaizOrani,
  hesaplaKredi,
  tahsisUcretiSiniri,
  teklifleriKarsilastir,
  tersHesap,
  validateAraOdemeler,
  validateKredi,
  yasalSinirUygula,
  type FaizGirisi,
  type Masraf,
  type MasrafTuru,
  type MasrafZamani,
} from './calc';

const TURLER = krediVergileri.values.turler;
const TUR_SIRASI: KrediTuru[] = ['ihtiyac', 'tasit', 'konut', 'konut-teminatli', 'telefon', 'ticari'];
const TUR_SECENEKLERI = TUR_SIRASI.map((t) => ({ value: t, label: TURLER[t].ad }));

const MASRAF_TURLERI: { value: MasrafTuru; label: string }[] = [
  { value: 'tahsis', label: 'Kredi tahsis ücreti' },
  { value: 'sigorta', label: 'Sigorta primi (hayat, konut, kasko…)' },
  { value: 'ekspertiz', label: 'Ekspertiz (değerleme) ücreti' },
  { value: 'ipotek', label: 'İpotek / rehin tesis ücreti' },
  { value: 'noter', label: 'Noter masrafı' },
  { value: 'diger', label: 'Diğer masraf' },
];
const MASRAF_ZAMANLARI: { value: MasrafZamani; label: string }[] = [
  { value: 'pesin', label: 'Peşin (açılışta)' },
  { value: 'aylik', label: 'Her ay' },
  { value: 'yillik', label: 'Yılda bir' },
];
const ENERJI_SECENEKLERI: { value: EnerjiSinifi; label: string }[] = [
  { value: 'ab', label: 'A veya B' },
  { value: 'c', label: 'C' },
  { value: 'diger', label: 'D ve altı / belge yok' },
];

const DEGER_GEREKEN: KrediTuru[] = ['tasit', 'konut', 'konut-teminatli', 'telefon'];
const ORNEK_DEGER: Partial<Record<KrediTuru, number>> = { tasit: 800_000, konut: 5_000_000, 'konut-teminatli': 5_000_000, telefon: 30_000 };

interface MasrafSatiri {
  id: number;
  tur: MasrafTuru;
  tutar: number | null;
  zaman: MasrafZamani;
}
interface AraSatiri {
  id: number;
  ay: number | null;
  tutar: number | null;
}
interface TeklifSatiri {
  id: number;
  faiz: number | null;
  vade: number | null;
  pesin: number | null;
  aylik: number | null;
}

const HARF = ['A', 'B', 'C', 'D'];

function SilDugmesi({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" class="line-item__remove" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
      </svg>
    </button>
  );
}

const yuzde = (kesir: number | null) => (kesir === null ? '–' : formatPercent(kesir * 100, 2));

export default function Calculator() {
  const sayac = useRef(1);
  const yeniId = () => sayac.current++;

  const [tur, setTur] = useState<KrediTuru>('ihtiyac');
  const [tutar, setTutar] = useState<number | null>(100_000);
  const [vade, setVade] = useState<number | null>(36);
  const [faizGiris, setFaizGiris] = useState<FaizGirisi>('aylik');
  const [faiz, setFaiz] = useState<number | null>(3);
  const [kkdf, setKkdf] = useState<number | null>(TURLER.ihtiyac.kkdf);
  const [bsmv, setBsmv] = useState<number | null>(TURLER.ihtiyac.bsmv);
  const [deger, setDeger] = useState<number | null>(null);
  const [yerliElektrikli, setYerliElektrikli] = useState(false);
  const [enerji, setEnerji] = useState<EnerjiSinifi>('c');
  const [baskaKonut, setBaskaKonut] = useState(false);
  const [yenilenmis, setYenilenmis] = useState(false);
  const [sinirUygula, setSinirUygula] = useState(true);
  const [masraflar, setMasraflar] = useState<MasrafSatiri[]>(() => [{ id: yeniId(), tur: 'tahsis', tutar: 500, zaman: 'pesin' }]);
  const [odemesiz, setOdemesiz] = useState<number | null>(0);
  const [araOdemeler, setAraOdemeler] = useState<AraSatiri[]>([]);
  const [teklifler, setTeklifler] = useState<TeklifSatiri[]>(() => [
    { id: yeniId(), faiz: 3, vade: 36, pesin: 500, aylik: 0 },
    { id: yeniId(), faiz: 2.89, vade: 36, pesin: 2_500, aylik: 0 },
  ]);
  const [tersTaksit, setTersTaksit] = useState<number | null>(5_000);
  const [tersVade, setTersVade] = useState<number | null>(36);

  const aile = (x: KrediTuru) => (x === 'konut-teminatli' ? 'konut' : x);
  const turSec = (t: KrediTuru) => {
    // Vergiler türün yasal oranına döner; değer alanı tür ailesi değişince örnek değerle dolar.
    if (DEGER_GEREKEN.includes(t) && aile(t) !== aile(tur)) setDeger(ORNEK_DEGER[t] ?? null);
    setTur(t);
    setKkdf(TURLER[t].kkdf);
    setBsmv(TURLER[t].bsmv);
  };

  useEffect(() => {
    // Paylaşılan bağlantı: ?tur=tasit&tutar=400000&vade=36&faiz=2.9&ft=aylik&deger=800000&m=tahsis:500:pesin
    const p = readParams();
    const t = enumParam(p, 'tur', TUR_SIRASI);
    if (t) {
      setTur(t);
      setKkdf(TURLER[t].kkdf);
      setBsmv(TURLER[t].bsmv);
    }
    const n = (k: string, set: (v: number) => void) => {
      const v = numParam(p, k);
      if (v !== null) set(v);
    };
    n('tutar', setTutar);
    n('vade', setVade);
    n('faiz', setFaiz);
    n('kkdf', setKkdf);
    n('bsmv', setBsmv);
    n('deger', setDeger);
    n('g', setOdemesiz);
    n('tt', setTersTaksit);
    n('tv', setTersVade);
    const ft = enumParam(p, 'ft', ['aylik', 'yillik'] as const);
    if (ft) setFaizGiris(ft);
    const es = enumParam(p, 'es', ['ab', 'c', 'diger'] as const);
    if (es) setEnerji(es);
    if (boolParam(p, 'ee')) setYerliElektrikli(true);
    if (boolParam(p, 'bk')) setBaskaKonut(true);
    if (boolParam(p, 'yn')) setYenilenmis(true);
    if (boolParam(p, 'sinir') === false) setSinirUygula(false);
    const m = p.get('m');
    if (m !== null) {
      const list = m
        .split(',')
        .map((x) => x.split(':'))
        .filter(([tr, tt, z]) => MASRAF_TURLERI.some((o) => o.value === tr) && Number.isFinite(Number(tt)) && MASRAF_ZAMANLARI.some((o) => o.value === z))
        .slice(0, 20)
        .map(([tr, tt, z]) => ({ id: yeniId(), tur: tr as MasrafTuru, tutar: Number(tt), zaman: z as MasrafZamani }));
      setMasraflar(list);
    }
    const ara = p.get('ara');
    if (ara) {
      setAraOdemeler(
        ara
          .split(',')
          .map((x) => x.split(':').map(Number))
          .filter(([a, tt]) => Number.isFinite(a) && Number.isFinite(tt))
          .slice(0, 24)
          .map(([a, tt]) => ({ id: yeniId(), ay: a, tutar: tt })),
      );
    }
    const tk = p.get('tk');
    if (tk) {
      const list = tk
        .split(',')
        .map((x) => x.split(':').map(Number))
        .filter((x) => x.length === 4 && x.every(Number.isFinite))
        .slice(0, 4)
        .map(([f, v, pe, ay]) => ({ id: yeniId(), faiz: f, vade: v, pesin: pe, aylik: ay }));
      if (list.length >= 1) setTeklifler(list);
    }
  }, []);

  // ---------- hesap ----------
  const aylikFaiz = faiz === null ? null : aylikFaizOrani(faiz, faizGiris);
  const hatalar = validateKredi({ anapara: tutar, vade, aylikFaiz, kkdf, bsmv, odemesizAy: odemesiz });
  const degerGerekli = DEGER_GEREKEN.includes(tur);
  const degerHata = degerGerekli && deger !== null && deger <= 0 ? 'Değer sıfırdan büyük olmalı.' : null;
  const masrafHatalari = masraflar.map((m) => (m.tutar !== null && m.tutar < 0 ? 'Tutar negatif olamaz.' : null));
  const temelGecerli = Object.keys(hatalar).length === 0 && !degerHata && masrafHatalari.every((h) => h === null);
  const tuketici = TURLER[tur].tuketici;

  const sinir =
    temelGecerli && sinirUygula && tuketici
      ? yasalSinirUygula({
          tur,
          tutar: tutar!,
          vade: vade!,
          deger,
          yerliElektrikli,
          enerjiSinifi: enerji,
          baskaKonut,
          yenilenmisTelefon: yenilenmis,
        })
      : null;
  const efTutar = sinir ? sinir.tutar : (tutar ?? 0);
  const efVade = sinir ? sinir.vade : (vade ?? 0);
  const masrafListesi: Masraf[] = masraflar.filter((m) => m.tutar !== null && m.tutar > 0).map((m) => ({ tur: m.tur, tutar: m.tutar!, zaman: m.zaman }));
  const araListesi = araOdemeler.filter((a) => a.ay !== null && a.tutar !== null).map((a) => ({ ay: a.ay!, tutar: a.tutar! }));
  const araHata =
    temelGecerli && araListesi.length > 0 && efVade > 0
      ? validateAraOdemeler(araListesi, { anapara: efTutar, vade: efVade, aylikFaiz: aylikFaiz!, kkdf: kkdf!, bsmv: bsmv!, odemesizAy: odemesiz ?? 0 })
      : null;
  const gecerli = temelGecerli && !araHata && !(sinir && sinir.krediYok);

  const sonuc = useMemo(
    () =>
      gecerli
        ? hesaplaKredi({
            anapara: efTutar,
            vade: efVade,
            aylikFaiz: aylikFaiz!,
            kkdf: kkdf!,
            bsmv: bsmv!,
            odemesizAy: odemesiz ?? 0,
            araOdemeler: araListesi,
            masraflar: masrafListesi,
          })
        : null,
    [gecerli, efTutar, efVade, aylikFaiz, kkdf, bsmv, odemesiz, JSON.stringify(araListesi), JSON.stringify(masrafListesi)],
  );

  // ---------- liste düzenleme ----------
  const masrafGuncelle = (id: number, patch: Partial<MasrafSatiri>) => setMasraflar((l) => l.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const araGuncelle = (id: number, patch: Partial<AraSatiri>) => setAraOdemeler((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const teklifGuncelle = (id: number, patch: Partial<TeklifSatiri>) => setTeklifler((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const tahsisSiniri = tutar !== null && tutar > 0 ? tahsisUcretiSiniri(efTutar || tutar) : null;
  const tahsisAsimi =
    tuketici && tahsisSiniri !== null && masraflar.some((m) => m.tur === 'tahsis' && m.zaman === 'pesin' && (m.tutar ?? 0) > tahsisSiniri);

  // ---------- teklif karşılaştırma ----------
  const teklifGecerli =
    gecerli && teklifler.every((t) => t.faiz !== null && t.faiz >= 0 && t.faiz <= 20 && t.vade !== null && Number.isInteger(t.vade) && t.vade >= 1 && t.vade <= 360 && (t.pesin ?? 0) >= 0 && (t.aylik ?? 0) >= 0);
  const teklifSonuclari = teklifGecerli
    ? teklifleriKarsilastir(
        efTutar,
        kkdf!,
        bsmv!,
        teklifler.map((t) => ({ aylikFaiz: aylikFaizOrani(t.faiz!, faizGiris), vade: t.vade!, pesinMasraf: t.pesin ?? 0, aylikMasraf: t.aylik ?? 0 })),
      )
    : null;
  const enUcuz = teklifSonuclari ? teklifSonuclari.reduce((best, s, i) => (s.toplamMaliyet < teklifSonuclari[best].toplamMaliyet ? i : best), 0) : -1;
  const enDusukYmo = teklifSonuclari
    ? teklifSonuclari.reduce((best, s, i) => ((s.ymoYillik ?? Infinity) < (teklifSonuclari[best].ymoYillik ?? Infinity) ? i : best), 0)
    : -1;
  const teklifVadeSiniri = sinirUygula && tuketici && (tur === 'ihtiyac' || tur === 'konut-teminatli') ? genelAzamiVade(efTutar) : (sinir?.azamiVade ?? null);

  // ---------- ters hesap ----------
  const tersGecerli =
    aylikFaiz !== null && !hatalar.faiz && !hatalar.kkdf && !hatalar.bsmv && tersTaksit !== null && tersTaksit > 0 && tersVade !== null && Number.isInteger(tersVade) && tersVade >= 1 && tersVade <= 360;
  const ters = tersGecerli
    ? tersHesap({
        taksit: tersTaksit!,
        vade: tersVade!,
        aylikFaiz: aylikFaiz!,
        kkdf: kkdf!,
        bsmv: bsmv!,
        sinir: sinirUygula && tuketici ? { tur, deger, yerliElektrikli, enerjiSinifi: enerji, baskaKonut, yenilenmisTelefon: yenilenmis } : null,
      })
    : null;

  // ---------- sonuç parçaları ----------
  const plan = sonuc?.plan;
  const vergi = plan ? round2(plan.toplamKkdf + plan.toplamBsmv) : 0;
  const ozet =
    sonuc && plan
      ? [
          `${TURLER[tur].ad}: ${formatTL(efTutar)}, ${efVade} ay, aylık faiz ${formatPercent(aylikFaiz!)}`,
          `Aylık taksit: ${formatTL(plan.taksit)}`,
          `Toplam faiz: ${formatTL(plan.toplamFaiz)}`,
          `KKDF: ${formatTL(plan.toplamKkdf)} · BSMV: ${formatTL(plan.toplamBsmv)}`,
          `Masraflar: ${formatTL(sonuc.masraf.toplam)}`,
          `Toplam geri ödeme (masraflar dahil): ${formatTL(sonuc.masrafDahilToplamOdeme)}`,
          `Yıllık maliyet oranı: ${yuzde(sonuc.ymoYillik)}`,
        ].join('\n')
      : '';

  const breakdownRows: BreakdownRow[] = plan
    ? [
        { label: 'Kredi tutarı (anapara)', value: formatTL(efTutar) },
        {
          label: 'Faiz',
          value: formatTL(plan.toplamFaiz),
          kind: 'plus',
          hint: plan.odemesizdeEklenen > 0 ? `Ödemesiz dönemde borca eklenen ${formatTL(plan.odemesizdeEklenen)} dahil` : undefined,
        },
        { label: `KKDF (faiz × %${formatNumber(kkdf!)})`, value: formatTL(plan.toplamKkdf), kind: 'plus' },
        { label: `BSMV (faiz × %${formatNumber(bsmv!)})`, value: formatTL(plan.toplamBsmv), kind: 'plus' },
        { label: 'Toplam geri ödeme', value: formatTL(plan.toplamOdeme), kind: 'total' },
        ...(sonuc!.masraf.toplam > 0
          ? [
              { label: 'Masraflar', value: formatTL(sonuc!.masraf.toplam), kind: 'plus' as const },
              { label: 'Masraflar dahil toplam ödeme', value: formatTL(sonuc!.masrafDahilToplamOdeme), kind: 'total' as const },
            ]
          : []),
        { label: 'Kredinin size maliyeti (faiz + vergi + masraf)', value: formatTL(sonuc!.toplamMaliyet), kind: 'sub' },
      ]
    : [];

  const degerEtiketi =
    tur === 'tasit'
      ? 'Araç değeri'
      : tur === 'telefon'
        ? 'Telefonun fiyatı'
        : 'Konutun değeri (ekspertiz)';
  const degerIpucu =
    tur === 'tasit'
      ? 'Sıfır araçta nihai fatura değeri, ikinci el araçta kasko değeri esas alınır.'
      : tur === 'telefon'
        ? 'Vade sınırı telefon fiyatına göre belirlenir.'
        : 'Kredi/değer oranı, değerleme raporundaki değer ve enerji sınıfına göre belirlenir.';

  return (
    <>
      <div class="calc-grid">
        <div class="calc-inputs">
          <SelectField id="kh-tur" label="Kredi türü" value={tur} onChange={turSec} options={TUR_SECENEKLERI} hint={TURLER[tur].aciklama} />

          <div class="row-2">
            <NumberField id="kh-tutar" label="Kredi tutarı" value={tutar} onChange={setTutar} suffix="TL" placeholder="ör. 100.000" error={hatalar.anapara} />
            <NumberField
              id="kh-vade"
              label="Vade"
              value={vade}
              onChange={setVade}
              suffix="ay"
              decimals={0}
              inputMode="numeric"
              error={hatalar.vade}
              hint={sinir?.azamiVade ? `Yasal azami vade: ${sinir.azamiVade} ay` : undefined}
            />
          </div>

          <Segmented
            name="kh-faiz-giris"
            label="Faiz oranını nasıl gireceksiniz?"
            value={faizGiris}
            onChange={setFaizGiris}
            options={[
              { value: 'aylik', label: 'Aylık' },
              { value: 'yillik', label: 'Yıllık (aylık × 12)' },
            ]}
          />
          <NumberField
            id="kh-faiz"
            label={faizGiris === 'aylik' ? 'Aylık faiz oranı' : 'Yıllık faiz oranı'}
            value={faiz}
            onChange={setFaiz}
            suffix="%"
            decimals={4}
            error={hatalar.faiz}
            hint={
              faizGiris === 'yillik' && aylikFaiz !== null && !hatalar.faiz
                ? `Aylık ${formatPercent(aylikFaiz, 4)} olarak hesaplanır.`
                : 'Varsayılan oran örnektir; bankanızın teklifindeki vergisiz akdi faizi yazın.'
            }
          />

          {degerGerekli && (
            <>
              <NumberField id="kh-deger" label={degerEtiketi} value={deger} onChange={setDeger} suffix="TL" error={degerHata} hint={degerIpucu} />
              {tur === 'tasit' && (
                <CheckboxField
                  id="kh-ee"
                  label="Yerli üretim elektrikli araç"
                  checked={yerliElektrikli}
                  onChange={setYerliElektrikli}
                  hint="Kurumlar Vergisi Kanunu geçici 12. madde kapsamındaki üreticilerin yalnızca elektrik motorlu araçları; sınırlar daha geniştir."
                />
              )}
              {(tur === 'konut' || tur === 'konut-teminatli') && (
                <>
                  <SelectField id="kh-enerji" label="Enerji kimlik belgesindeki sınıf" value={enerji} onChange={setEnerji} options={ENERJI_SECENEKLERI} />
                  <CheckboxField
                    id="kh-bk"
                    label="Benim, eşimin veya 18 yaş altı çocuğumun konutu var"
                    checked={baskaKonut}
                    onChange={setBaskaKonut}
                    hint="Bu durumda kredi/değer oranı %75 azaltılır. Köydeki konutlar ve %50 ve altı hisse (tek hisseli tapu) sayılmaz."
                  />
                </>
              )}
              {tur === 'telefon' && (
                <CheckboxField id="kh-yn" label="Yenilenmiş telefon (yenileme merkezi / yetkili satıcıdan)" checked={yenilenmis} onChange={setYenilenmis} />
              )}
            </>
          )}

          {tuketici && (
            <CheckboxField
              id="kh-sinir"
              label="BDDK vade ve kredi/değer sınırlarını uygula"
              checked={sinirUygula}
              onChange={setSinirUygula}
              hint="Bankalar bu sınırların üzerinde kredi kullandıramaz. Afet bölgesi gibi özel düzenlemeler için kapatabilirsiniz."
            />
          )}

          <p class="calc-section-title">Faize eklenen vergiler</p>
          <div class="row-2">
            <NumberField id="kh-kkdf" label="KKDF" value={kkdf} onChange={setKkdf} suffix="%" error={hatalar.kkdf} />
            <NumberField id="kh-bsmv" label="BSMV" value={bsmv} onChange={setBsmv} suffix="%" error={hatalar.bsmv} />
          </div>

          <div class="field">
            <span class="field__label">Masraflar</span>
            <ul class="line-items">
              {masraflar.map((m, i) => (
                <li class="line-item" key={m.id}>
                  <div class="line-item__head">
                    <span>Masraf {i + 1}</span>
                    <SilDugmesi onClick={() => setMasraflar((l) => l.filter((x) => x.id !== m.id))} label={`Masraf ${i + 1}’i sil`} />
                  </div>
                  <SelectField id={`kh-mt-${m.id}`} label="Masraf türü" value={m.tur} onChange={(v) => masrafGuncelle(m.id, { tur: v })} options={MASRAF_TURLERI} />
                  <div class="line-item__fields">
                    <NumberField
                      id={`kh-mm-${m.id}`}
                      label="Tutar"
                      value={m.tutar}
                      onChange={(v) => masrafGuncelle(m.id, { tutar: v })}
                      suffix="TL"
                      error={masrafHatalari[i]}
                      hint={m.tur === 'tahsis' && tuketici && tahsisSiniri !== null ? `Yasal üst sınır: ${formatTL(tahsisSiniri)} (anaparanın binde 5’i, vergi hariç)` : undefined}
                    />
                    <SelectField id={`kh-mz-${m.id}`} label="Ne zaman?" value={m.zaman} onChange={(v) => masrafGuncelle(m.id, { zaman: v })} options={MASRAF_ZAMANLARI} />
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              class="btn btn--small add-row"
              onClick={() => setMasraflar((l) => [...l, { id: yeniId(), tur: l.length === 0 ? 'tahsis' : 'sigorta', tutar: null, zaman: 'pesin' }])}
            >
              + Masraf ekle
            </button>
          </div>

          <Details summary="Gelişmiş: ödemesiz dönem ve ara ödemeler">
            <div class="calc-inputs">
              <NumberField
                id="kh-odemesiz"
                label="İlk taksitten önce ödemesiz dönem"
                value={odemesiz}
                onChange={setOdemesiz}
                suffix="ay"
                decimals={0}
                inputMode="numeric"
                error={hatalar.odemesiz}
                hint="Bu sürede işleyen faiz ve vergisi borca eklenir; taksitler yeni borç üzerinden hesaplanır. Bankanızın yöntemi farklı olabilir."
              />
              <div class="field">
                <span class="field__label">Plandaki ara (balon) ödemeler</span>
                {araOdemeler.length > 0 && (
                  <ul class="line-items">
                    {araOdemeler.map((a, i) => (
                      <li class="line-item" key={a.id}>
                        <div class="line-item__head">
                          <span>Ara ödeme {i + 1}</span>
                          <SilDugmesi onClick={() => setAraOdemeler((l) => l.filter((x) => x.id !== a.id))} label={`Ara ödeme ${i + 1}’i sil`} />
                        </div>
                        <div class="line-item__fields">
                          <NumberField id={`kh-aa-${a.id}`} label="Tutar" value={a.tutar} onChange={(v) => araGuncelle(a.id, { tutar: v })} suffix="TL" />
                          <NumberField
                            id={`kh-ay-${a.id}`}
                            label="Kaçıncı taksitle?"
                            value={a.ay}
                            onChange={(v) => araGuncelle(a.id, { ay: v })}
                            decimals={0}
                            inputMode="numeric"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {araHata && <p class="field__error">{araHata}</p>}
                <button
                  type="button"
                  class="btn btn--small add-row"
                  onClick={() => setAraOdemeler((l) => (l.length >= 24 ? l : [...l, { id: yeniId(), ay: Math.min(12, efVade || 12), tutar: null }]))}
                >
                  + Ara ödeme ekle
                </button>
                <p class="field__hint">
                  Ara ödemeli kredide plana yazılan ek ödemeler nedeniyle aylık taksit düşer. Tüketici kredisinde sonradan yapılan
                  ara ödemede kalan taksit sayısı değişmez, taksit tutarı yeniden hesaplanır (Tüketici Kredisi Sözleşmeleri
                  Yönetmeliği md. 17).
                </p>
              </div>
            </div>
          </Details>
        </div>

        <div class="calc-results">
          {sinir?.krediYok ? (
            <Callout kind="danger">
              <strong>Bu araca taşıt kredisi kullandırılamaz.</strong> {sinir.aciklamalar.join(' ')}
            </Callout>
          ) : sonuc && plan ? (
            <>
              <ResultHero
                label={plan.satirlar.some((s) => s.araOdeme > 0) ? 'Aylık taksit (ara ödemeler hariç)' : 'Aylık taksit'}
                value={formatTL(plan.taksit)}
                sub={
                  <>
                    {efVade} taksit{(odemesiz ?? 0) > 0 ? `, ilk ${odemesiz} ay ödemesiz` : ''} · toplam geri ödeme{' '}
                    <strong>{formatTL(plan.toplamOdeme)}</strong>
                    {Math.abs(plan.sonTaksit - plan.taksit) >= 0.05 ? ` · son taksit ${formatTL(plan.sonTaksit)}` : ''}
                  </>
                }
              />

              {sinir && sinir.aciklamalar.length > 0 && (
                <Callout kind="warning">
                  <strong>Yasal sınır uygulandı.</strong>
                  <ul>
                    {sinir.aciklamalar.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </Callout>
              )}

              <Breakdown rows={breakdownRows} />

              <StatGrid
                items={[
                  { label: 'Yıllık maliyet oranı', value: yuzde(sonuc.ymoYillik) },
                  { label: 'Aylık maliyet oranı', value: yuzde(sonuc.ymoAylik) },
                  { label: 'Vergiler dahil aylık faiz', value: formatPercent(plan.vergiDahilAylikOran * 100, 4) },
                  { label: 'Yıllık akdi faiz (aylık × 12)', value: formatPercent(sonuc.yillikNominal, 2) },
                ]}
              />

              <StackedBar
                label="Toplam ödemenin dağılımı"
                parts={[
                  { label: 'Anapara', value: efTutar, display: formatTL(efTutar, 0) },
                  { label: 'Faiz', value: plan.toplamFaiz, display: formatTL(plan.toplamFaiz, 0) },
                  { label: 'KKDF + BSMV', value: vergi, display: formatTL(vergi, 0) },
                  { label: 'Masraf', value: sonuc.masraf.toplam, display: formatTL(sonuc.masraf.toplam, 0) },
                ]}
              />

              {tahsisAsimi && tahsisSiniri !== null && (
                <Callout kind="warning">
                  Girdiğiniz tahsis ücreti, yasal üst sınır olan {formatTL(tahsisSiniri)} tutarını (anaparanın binde 5’i, vergi hariç)
                  aşıyor. Tutar BSMV dahil değilse bankanızla kontrol edin.
                </Callout>
              )}
              {sonuc.masraf.ymoDisi > 0 && (
                <Callout kind="info">Noter masrafları yönetmelik gereği yıllık maliyet oranına dahil edilmez; toplam ödemede gösterilir.</Callout>
              )}
              {!tuketici && (
                <Callout kind="info">Ticari kredilerde tüketici kredisi vade ve kredi/değer sınırları ile tahsis ücreti sınırı uygulanmaz.</Callout>
              )}

              <ShareBar
                params={{
                  tur,
                  tutar,
                  vade,
                  faiz,
                  ft: faizGiris === 'yillik' ? 'yillik' : null,
                  kkdf: kkdf !== TURLER[tur].kkdf ? kkdf : null,
                  bsmv: bsmv !== TURLER[tur].bsmv ? bsmv : null,
                  deger: degerGerekli ? deger : null,
                  ee: tur === 'tasit' && yerliElektrikli ? true : null,
                  es: tur === 'konut' || tur === 'konut-teminatli' ? enerji : null,
                  bk: baskaKonut && (tur === 'konut' || tur === 'konut-teminatli') ? true : null,
                  yn: tur === 'telefon' && yenilenmis ? true : null,
                  sinir: sinirUygula ? null : false,
                  m: masraflar.filter((m) => m.tutar !== null).map((m) => `${m.tur}:${m.tutar}:${m.zaman}`).join(',') || 'yok',
                  g: odemesiz ? odemesiz : null,
                  ara: araListesi.map((a) => `${a.ay}:${a.tutar}`).join(','),
                  tk: teklifler.map((t) => `${t.faiz ?? 0}:${t.vade ?? 0}:${t.pesin ?? 0}:${t.aylik ?? 0}`).join(','),
                  tt: tersTaksit,
                  tv: tersVade,
                }}
                summary={ozet}
              />
            </>
          ) : (
            <ResultEmpty>{araHata ?? 'Sonucu görmek için kredi tutarı, vade ve faiz oranını girin.'}</ResultEmpty>
          )}
        </div>
      </div>

      {sonuc && plan && (
        <section class="calc-wide" aria-label="Ödeme planı">
          <p class="calc-section-title">Ödeme planı</p>
          <DataTable
            scroll
            columns={[
              { key: 'no', label: 'Ay' },
              { key: 'odeme', label: 'Ödeme' },
              { key: 'anapara', label: 'Anapara' },
              { key: 'faiz', label: 'Faiz' },
              { key: 'kkdf', label: 'KKDF' },
              { key: 'bsmv', label: 'BSMV' },
              { key: 'kalan', label: 'Kalan anapara' },
            ]}
            rows={plan.satirlar.map((s) => ({
              no: s.taksitNo === null ? `${s.no} (ödemesiz)` : String(s.no),
              odeme: s.araOdeme > 0 ? `${formatTL(s.odeme)} (ara ödeme dahil)` : formatTL(s.odeme),
              anapara: s.anapara < 0 ? `+${formatTL(-s.anapara)} borca eklendi` : formatTL(s.anapara),
              faiz: formatTL(s.faiz),
              kkdf: formatTL(s.kkdf),
              bsmv: formatTL(s.bsmv),
              kalan: formatTL(s.kalan),
            }))}
            foot={{
              no: 'Toplam',
              odeme: formatTL(plan.toplamOdeme),
              anapara: formatTL(efTutar),
              faiz: formatTL(plan.toplamFaiz),
              kkdf: formatTL(plan.toplamKkdf),
              bsmv: formatTL(plan.toplamBsmv),
              kalan: '',
            }}
          />
        </section>
      )}

      <section class="calc-wide" aria-label="Teklif karşılaştırma">
        <p class="calc-section-title">Banka tekliflerini karşılaştırın</p>
        <p class="field__hint">
          Aynı tutar ({formatTL(efTutar || (tutar ?? 0), 0)}) ve aynı vergi oranlarıyla en fazla 4 teklifi yan yana koyun. Faiz
          oranları yukarıda seçtiğiniz biçimde ({faizGiris === 'aylik' ? 'aylık' : 'yıllık'}) girilir. Varsayılan teklifler örnektir.
        </p>
        <ul class="line-items">
          {teklifler.map((t, i) => (
            <li class="line-item" key={t.id}>
              <div class="line-item__head">
                <span>Teklif {HARF[i]}</span>
                {teklifler.length > 2 && <SilDugmesi onClick={() => setTeklifler((l) => l.filter((x) => x.id !== t.id))} label={`Teklif ${HARF[i]}’yi sil`} />}
              </div>
              <div class="line-item__fields">
                <NumberField id={`kh-tf-${t.id}`} label="Faiz oranı" value={t.faiz} onChange={(v) => teklifGuncelle(t.id, { faiz: v })} suffix="%" decimals={4} />
                <NumberField id={`kh-tv-${t.id}`} label="Vade" value={t.vade} onChange={(v) => teklifGuncelle(t.id, { vade: v })} suffix="ay" decimals={0} inputMode="numeric" />
              </div>
              <div class="line-item__fields">
                <NumberField id={`kh-tp-${t.id}`} label="Peşin masraflar" value={t.pesin} onChange={(v) => teklifGuncelle(t.id, { pesin: v })} suffix="TL" />
                <NumberField id={`kh-ta-${t.id}`} label="Aylık masraf (ör. sigorta)" value={t.aylik} onChange={(v) => teklifGuncelle(t.id, { aylik: v })} suffix="TL" />
              </div>
            </li>
          ))}
        </ul>
        {teklifler.length < 4 && (
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() => setTeklifler((l) => [...l, { id: yeniId(), faiz: l[l.length - 1]?.faiz ?? 3, vade: l[l.length - 1]?.vade ?? 36, pesin: 0, aylik: 0 }])}
          >
            + Teklif ekle
          </button>
        )}
        {teklifSonuclari ? (
          <>
            <DataTable
              columns={[
                { key: 'ad', label: 'Teklif' },
                { key: 'taksit', label: 'Taksit' },
                { key: 'faizVergi', label: 'Faiz + vergi' },
                { key: 'masraf', label: 'Masraf' },
                { key: 'maliyet', label: 'Toplam maliyet' },
                { key: 'odeme', label: 'Toplam ödeme' },
                { key: 'ymo', label: 'Yıllık maliyet oranı' },
              ]}
              rows={teklifSonuclari.map((s, i) => ({
                ad: `${HARF[i]} · ${teklifler[i].vade} ay${teklifVadeSiniri !== null && teklifler[i].vade! > teklifVadeSiniri ? ' (yasal vadeyi aşıyor)' : ''}`,
                taksit: formatTL(s.taksit),
                faizVergi: formatTL(s.faizVergi),
                masraf: formatTL(s.masraf),
                maliyet: i === enUcuz ? `${formatTL(s.toplamMaliyet)} ✓` : formatTL(s.toplamMaliyet),
                odeme: formatTL(s.toplamOdeme),
                ymo: i === enDusukYmo ? `${yuzde(s.ymoYillik)} ✓` : yuzde(s.ymoYillik),
              }))}
            />
            <Callout kind="info">
              En düşük toplam maliyet: <strong>Teklif {HARF[enUcuz]}</strong>
              {teklifSonuclari.length > 1 &&
                ` (en yüksek maliyetli tekliften ${formatTL(Math.max(...teklifSonuclari.map((s) => s.toplamMaliyet)) - teklifSonuclari[enUcuz].toplamMaliyet)} daha az)`}
              . En düşük yıllık maliyet oranı: <strong>Teklif {HARF[enDusukYmo]}</strong>. Vadeler farklıysa uzun vade toplam
              maliyeti büyütür; farklı vadeleri yıllık maliyet oranı daha adil karşılaştırır.
            </Callout>
          </>
        ) : (
          <ResultEmpty>Karşılaştırma için her teklife faiz (aylık en fazla %20) ve 1–360 ay arası vade girin.</ResultEmpty>
        )}
      </section>

      <section class="calc-wide" aria-label="Ters hesap">
        <p class="calc-section-title">Bu taksitle ne kadar kredi çekebilirim?</p>
        <div class="row-2">
          <NumberField id="kh-tt" label="Ödeyebileceğim aylık taksit" value={tersTaksit} onChange={setTersTaksit} suffix="TL" />
          <NumberField id="kh-tvv" label="İstediğim vade" value={tersVade} onChange={setTersVade} suffix="ay" decimals={0} inputMode="numeric" />
        </div>
        {ters ? (
          <>
            <StatGrid
              items={[
                { label: 'Çekebileceğiniz azami kredi', value: formatTL(ters.tutar) },
                { label: 'Kullanılan vade', value: `${ters.vade} ay` },
                ...(ters.sinirsizTutar !== ters.tutar ? [{ label: 'Sınır olmasaydı', value: formatTL(ters.sinirsizTutar) }] : []),
              ]}
            />
            {ters.neden && <Callout kind="warning">{ters.neden}</Callout>}
            {ters.secenekler && ters.secenekler.length > 1 && (
              <DataTable
                caption="Vade dilimlerine göre"
                columns={[
                  { key: 'vade', label: 'Vade' },
                  { key: 'tutar', label: 'Azami kredi' },
                  { key: 'not', label: 'Belirleyen' },
                ]}
                rows={ters.secenekler.map((s) => ({
                  vade: `${s.vade} ay`,
                  tutar: formatTL(s.tutar),
                  not: s.tutarSiniri !== null && s.tutar >= s.tutarSiniri ? `Bu vade en fazla ${formatTL(s.tutarSiniri, 0)} krediye verilir` : 'Taksit tutarınız',
                }))}
              />
            )}
            <p class="field__hint">
              Hesap, yukarıdaki kredi türü, faiz oranı ({aylikFaiz !== null ? formatPercent(aylikFaiz, 4) : '–'} aylık), KKDF ve BSMV
              ile yapılır; bankalar ayrıca gelirinize göre ödeme gücü değerlendirmesi yapar.
            </p>
          </>
        ) : (
          <ResultEmpty>Taksit tutarı ve 1–360 ay arası vade girin; faiz oranı yukarıdan alınır.</ResultEmpty>
        )}
      </section>
    </>
  );
}
