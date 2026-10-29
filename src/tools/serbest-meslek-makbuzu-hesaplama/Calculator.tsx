import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { kismiTevkifatSiniri, tevkifatSiniriOn } from '../../data/params/kdv';
import { serbestMeslekStopaji, smmTevkifatKurali } from '../../data/params/serbest-meslek';
import { todayIsoTR } from '../../lib/finance';
import { formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero, type BreakdownRow } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import {
  hesaplaSmm,
  hesaplaTahsilattan,
  validateKalem,
  validateStopaj,
  type SmmAliciTuru,
  type SmmAyar,
  type SmmSonuc,
  type SmmYon,
} from './calc';

type Yon = SmmYon | 'tahsilat';
const YON_SECENEKLERI: { value: Yon; label: string }[] = [
  { value: 'brut', label: 'Brüt ücret' },
  { value: 'net', label: 'Net ücret' },
  { value: 'kdvDahil', label: 'KDV dahil fiyat' },
  { value: 'tahsilat', label: 'Hesaba yatan' },
];

type OranSecim = '20' | '10' | '1' | '0' | 'diger';
const ORAN_SECENEKLERI: { value: OranSecim; label: string }[] = [
  { value: '20', label: '%20 (genel oran)' },
  { value: '10', label: '%10' },
  { value: '1', label: '%1' },
  { value: '0', label: '%0 (istisna / KDV’siz)' },
  { value: 'diger', label: 'Diğer oran…' },
];

type StopajSecim = 'genel' | 'md18' | 'yok' | 'diger';
type TevkifatSecim = 'yok' | '3' | '4' | '5' | '9';

const ALICI_SECENEKLERI: { value: SmmAliciTuru; label: string }[] = [
  { value: 'mukellef', label: 'Şirket veya KDV mükellefi işletme' },
  { value: 'tuketici', label: 'Bireysel müşteri / KDV mükellefi olmayan' },
  { value: 'kamu', label: 'Kamu kurumu, banka, sigorta şirketi, KİT, meslek odası vb.' },
  { value: 'belirlenmis', label: 'Borsada işlem gören şirket, vakıf üniversitesi, sendika, mobil operatör vb.' },
];

const { genelOran: STOPAJ_GENEL, md18Oran: STOPAJ_MD18 } = serbestMeslekStopaji.values;
const SINIR_YILLARI = kismiTevkifatSiniri.values.donemler.map((d) => d.from.slice(0, 4));

interface Kalem {
  id: number;
  ad: string;
  tutar: number | null;
  oranSecim: OranSecim;
  ozelOran: number | null;
  tevkifatli: boolean;
}

const kalemOlustur = (id: number, tutar: number | null = null, oran = 20, tevkifatli = true, ad = ''): Kalem => {
  const secim = (['20', '10', '1', '0'] as const).find((s) => Number(s) === oran);
  return { id, ad, tutar, oranSecim: secim ?? 'diger', ozelOran: secim ? null : oran, tevkifatli };
};
const oranOf = (k: { oranSecim: OranSecim; ozelOran: number | null }): number | null =>
  k.oranSecim === 'diger' ? k.ozelOran : Number(k.oranSecim);

const TUTAR_ETIKETI: Record<SmmYon, string> = {
  brut: 'Brüt ücret (KDV hariç)',
  net: 'Net ücret (stopaj düşüldükten sonra, KDV hariç)',
  kdvDahil: 'KDV dahil fiyat (stopaj düşülmeden)',
};

export default function Calculator() {
  const sayac = useRef(1);
  const yeniKalem = (tutar: number | null = null, oran = 20, tevkifatli = true) =>
    kalemOlustur(sayac.current++, tutar, oran, tevkifatli);

  const [yon, setYon] = useState<Yon>('brut');
  const [kalemler, setKalemler] = useState<Kalem[]>(() => [yeniKalem(10000, 20)]);
  const [tahsilat, setTahsilat] = useState<number | null>(10000);
  const [tOranSecim, setTOranSecim] = useState<OranSecim>('20');
  const [tOzelOran, setTOzelOran] = useState<number | null>(null);

  const [musteri, setMusteri] = useState<SmmAliciTuru>('mukellef');
  const [stopajSecim, setStopajSecim] = useState<StopajSecim>('genel');
  const [ozelStopaj, setOzelStopaj] = useState<number | null>(null);
  const [tevkifat, setTevkifat] = useState<TevkifatSecim>('yok');
  const [sinirUygula, setSinirUygula] = useState(true);
  const [yil, setYil] = useState<string>(() => SINIR_YILLARI[SINIR_YILLARI.length - 1]);

  useEffect(() => {
    const buYil = todayIsoTR().slice(0, 4);
    if (SINIR_YILLARI.includes(buYil)) setYil(buYil);

    // Paylaşılan bağlantı: ?y=net&s=8000:20:1,500:10:0&st=20&m=kamu&tev=9&sinir=0&yil=2026&t=10000&to=20
    const p = readParams();
    const y = enumParam(p, 'y', ['brut', 'net', 'kdvDahil', 'tahsilat'] as const);
    if (y) setYon(y);
    const s = p.get('s');
    if (s) {
      const list = s
        .split(',')
        .map((part) => part.split(':'))
        .filter(([t, o]) => Number.isFinite(Number(t)) && Number.isFinite(Number(o)))
        .slice(0, 30)
        .map(([t, o, f]) => yeniKalem(Number(t), Number(o), f !== '0'));
      if (list.length > 0) setKalemler(list);
    }
    const st = numParam(p, 'st');
    if (st !== null) {
      if (st === STOPAJ_GENEL) setStopajSecim('genel');
      else if (st === STOPAJ_MD18) setStopajSecim('md18');
      else if (st === 0) setStopajSecim('yok');
      else {
        setStopajSecim('diger');
        setOzelStopaj(st);
      }
    }
    const m = enumParam(p, 'm', ['mukellef', 'tuketici', 'kamu', 'belirlenmis'] as const);
    if (m) setMusteri(m);
    const tev = enumParam(p, 'tev', ['yok', '3', '4', '5', '9'] as const);
    if (tev) setTevkifat(tev);
    if (boolParam(p, 'sinir') === false) setSinirUygula(false);
    const yl = numParam(p, 'yil');
    if (yl !== null && SINIR_YILLARI.includes(String(yl))) setYil(String(yl));
    const t = numParam(p, 't');
    if (t !== null) setTahsilat(t);
    const to = numParam(p, 'to');
    if (to !== null) {
      const secim = (['20', '10', '1', '0'] as const).find((x) => Number(x) === to);
      if (secim) setTOranSecim(secim);
      else {
        setTOranSecim('diger');
        setTOzelOran(to);
      }
    }
  }, []);

  const guncelle = (id: number, patch: Partial<Kalem>) =>
    setKalemler((list) => list.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  const sil = (id: number) => setKalemler((list) => (list.length > 1 ? list.filter((k) => k.id !== id) : list));
  const ekle = () => setKalemler((list) => [...list, yeniKalem(null, oranOf(list[list.length - 1]) ?? 20)]);

  // Müşteri türü bireysel seçilince stopaj kapanır (bireysel müşteri stopaj sorumlusu değildir); geri dönünce genel orana döner.
  const musteriDegisti = (yeni: SmmAliciTuru) => {
    if (yeni === 'tuketici' && stopajSecim !== 'yok') setStopajSecim('yok');
    else if (yeni !== 'tuketici' && musteri === 'tuketici' && stopajSecim === 'yok') setStopajSecim('genel');
    setMusteri(yeni);
  };

  const stopajOrani =
    stopajSecim === 'genel' ? STOPAJ_GENEL : stopajSecim === 'md18' ? STOPAJ_MD18 : stopajSecim === 'yok' ? 0 : ozelStopaj;
  const stopajHata = stopajSecim === 'diger' ? validateStopaj(ozelStopaj) : undefined;

  const pay = tevkifat === 'yok' ? 0 : Number(tevkifat);
  const kismi = pay > 0 && pay < 10;
  const sinir = tevkifatSiniriOn(`${yil}-06-30`).tutar;
  const kural = pay > 0 ? smmTevkifatKurali(pay) : undefined;
  const cokKalem = yon !== 'tahsilat' && kalemler.length > 1;
  const tahsilatOran = tOranSecim === 'diger' ? tOzelOran : Number(tOranSecim);

  const kalemHatalari = kalemler.map((k) => validateKalem(k.tutar, oranOf(k)));
  const tahsilatHata = validateKalem(tahsilat, tahsilatOran);
  const gecerli =
    !stopajHata && (yon === 'tahsilat' ? !tahsilatHata.tutar && !tahsilatHata.kdvOrani : kalemHatalari.every((h) => !h.tutar && !h.kdvOrani));

  const hesap = useMemo(() => {
    if (!gecerli || stopajOrani === null) return null;
    const ayar: SmmAyar = {
      stopajOrani,
      tevkifatPayi: pay,
      alici: musteri,
      tevkifatSiniri: kismi && sinirUygula ? sinir : null,
    };
    if (yon === 'tahsilat') return hesaplaTahsilattan(tahsilat!, tahsilatOran!, ayar);
    const sonuc = hesaplaSmm({
      ...ayar,
      yon,
      kalemler: kalemler.map((k) => ({ tutar: k.tutar!, kdvOrani: oranOf(k)!, tevkifatli: k.tevkifatli })),
    });
    return { sonuc, adaylar: [sonuc.brut], fark: 0 };
  }, [gecerli, stopajOrani, pay, musteri, kismi, sinirUygula, sinir, yon, tahsilat, tahsilatOran, kalemler]);

  const sonuc: SmmSonuc | null = hesap ? hesap.sonuc : null;
  const stopajEtiketi = stopajOrani ? `Gelir vergisi stopajı (${formatPercent(stopajOrani)})` : 'Gelir vergisi stopajı';
  const kdvEtiketi = sonuc
    ? `KDV ${sonuc.kalemler.length === 1 || new Set(sonuc.kalemler.map((k) => k.kdvOrani)).size === 1 ? `(${formatPercent(sonuc.kalemler[0].kdvOrani)})` : '(karışık oranlar)'}`
    : 'KDV';

  const makbuzSatirlari: BreakdownRow[] = sonuc
    ? [
        { label: 'Brüt ücret', value: formatTL(sonuc.brut) },
        {
          label: stopajEtiketi,
          value: sonuc.stopaj > 0 ? `− ${formatTL(sonuc.stopaj)}` : formatTL(0),
          kind: sonuc.stopaj > 0 ? 'minus' : 'normal',
          hint: sonuc.stopaj > 0 ? 'Müşteri keser, sizin adınıza vergi dairesine yatırır.' : 'Stopaj yok: ödeme tutarının tamamı size gelir.',
        },
        { label: 'Net ücret', value: formatTL(sonuc.net), kind: 'sub' },
        { label: kdvEtiketi, value: `+ ${formatTL(sonuc.kdv)}`, kind: 'plus' },
        ...(sonuc.uygulananTevkifat > 0
          ? [
              {
                label: `KDV tevkifatı (${sonuc.uygulananTevkifat}/10)`,
                value: `− ${formatTL(sonuc.tevkifEdilenKdv)}`,
                kind: 'minus' as const,
                hint: 'Müşteri bu KDV’yi size ödemez; KDV-2 beyannamesiyle kendisi öder.',
              },
            ]
          : []),
        { label: 'Tahsil edilecek toplam', value: formatTL(sonuc.tahsilat), kind: 'total' },
      ]
    : [];

  const ozet = sonuc
    ? [
        `Brüt ücret: ${formatTL(sonuc.brut)}`,
        `${stopajEtiketi}: ${formatTL(sonuc.stopaj)}`,
        `Net ücret: ${formatTL(sonuc.net)}`,
        `${kdvEtiketi}: ${formatTL(sonuc.kdv)}`,
        ...(sonuc.uygulananTevkifat > 0 ? [`KDV tevkifatı (${sonuc.uygulananTevkifat}/10): ${formatTL(sonuc.tevkifEdilenKdv)}`] : []),
        `Tahsil edilecek toplam: ${formatTL(sonuc.tahsilat)}`,
      ].join('\n')
    : '';

  const tevkifatMesaji =
    sonuc && pay > 0 && !sonuc.tevkifatDurumu.uygulanir && 'aciklama' in sonuc.tevkifatDurumu ? sonuc.tevkifatDurumu.aciklama : null;

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="smm-yon"
          label="Elinizdeki tutar hangisi?"
          value={yon}
          onChange={setYon}
          options={YON_SECENEKLERI}
          hint={
            yon === 'brut'
              ? 'Makbuzda yazan KDV hariç tutarı biliyorsunuz; hesaba ne yatacağını bulun.'
              : yon === 'net'
                ? 'Stopaj düşüldükten sonra elinize geçmesini istediğiniz net ücreti yazın; makbuzu kaç TL keseceğinizi bulun.'
                : yon === 'kdvDahil'
                  ? 'Müşteriye “KDV dahil X TL” dediyseniz brüt ücreti, stopajı ve tahsilatı bulun.'
                  : 'Müşteriden hesabınıza yatan (stopaj ve varsa tevkifat düşülmüş) tutardan makbuzun brütünü bulun. Tek kalem varsayılır.'
          }
        />

        {yon !== 'tahsilat' ? (
          <div class="field">
            <span class="field__label">Hizmet kalemleri</span>
            <ul class="line-items">
              {kalemler.map((k, i) => (
                <li class="line-item" key={k.id}>
                  <div class="line-item__head">
                    <span>Kalem {i + 1}</span>
                    {cokKalem && (
                      <button type="button" class="line-item__remove" onClick={() => sil(k.id)} aria-label={`Kalem ${i + 1}’i sil`}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <TextField
                    id={`smm-ad-${k.id}`}
                    label="Açıklama (isteğe bağlı)"
                    value={k.ad}
                    onChange={(v) => guncelle(k.id, { ad: v })}
                    placeholder="ör. Danışmanlık hizmeti"
                  />
                  <div class="line-item__fields">
                    <NumberField
                      id={`smm-tutar-${k.id}`}
                      label={TUTAR_ETIKETI[yon]}
                      value={k.tutar}
                      onChange={(v) => guncelle(k.id, { tutar: v })}
                      suffix="TL"
                      placeholder="ör. 10.000"
                      error={kalemHatalari[i].tutar}
                    />
                    <SelectField
                      id={`smm-oran-${k.id}`}
                      label="KDV oranı"
                      value={k.oranSecim}
                      onChange={(v) => guncelle(k.id, { oranSecim: v })}
                      options={ORAN_SECENEKLERI}
                    />
                  </div>
                  {k.oranSecim === 'diger' && (
                    <NumberField
                      id={`smm-ozel-${k.id}`}
                      label="Özel KDV oranı"
                      value={k.ozelOran}
                      onChange={(v) => guncelle(k.id, { ozelOran: v })}
                      suffix="%"
                      error={kalemHatalari[i].kdvOrani}
                    />
                  )}
                  {pay > 0 && cokKalem && (
                    <CheckboxField
                      id={`smm-tevkifatli-${k.id}`}
                      label="Bu kalem KDV tevkifatına tabi"
                      checked={k.tevkifatli}
                      onChange={(v) => guncelle(k.id, { tevkifatli: v })}
                      hint="Masraf yansıtması gibi tevkifat kapsamı dışındaki kalemlerin işaretini kaldırın."
                    />
                  )}
                </li>
              ))}
            </ul>
            <button type="button" class="btn btn--small add-row" onClick={ekle}>
              + Kalem ekle
            </button>
          </div>
        ) : (
          <>
            <NumberField
              id="smm-tahsilat"
              label="Hesabınıza yatan toplam tutar"
              value={tahsilat}
              onChange={setTahsilat}
              suffix="TL"
              placeholder="ör. 10.000"
              error={tahsilatHata.tutar}
            />
            <div class="row-2">
              <SelectField
                id="smm-t-oran"
                label="KDV oranı"
                value={tOranSecim}
                onChange={setTOranSecim}
                options={ORAN_SECENEKLERI}
              />
              {tOranSecim === 'diger' && (
                <NumberField
                  id="smm-t-ozel"
                  label="Özel KDV oranı"
                  value={tOzelOran}
                  onChange={setTOzelOran}
                  suffix="%"
                  error={tahsilatHata.kdvOrani}
                />
              )}
            </div>
          </>
        )}

        <div class="calc-section-title">Müşteri ve vergi kesintileri</div>

        <SelectField
          id="smm-musteri"
          label="Makbuzu kesen müşteri kim?"
          value={musteri}
          onChange={musteriDegisti}
          options={ALICI_SECENEKLERI}
          hint="Stopajı yalnızca GVK md. 94’te sayılan ödeyiciler (kamu kurumları, şirketler, dernek ve vakıflar, kooperatifler, gerçek usulde vergilenen işletmeler ve serbest meslek erbapları) keser. KDV tevkifatı ise alıcının türüne göre değişir."
        />

        <Segmented
          name="smm-stopaj"
          label="Gelir vergisi stopajı"
          value={stopajSecim}
          onChange={setStopajSecim}
          options={[
            { value: 'genel', label: `%${STOPAJ_GENEL} (genel)` },
            { value: 'md18', label: `%${STOPAJ_MD18} (telif / GVK md. 18)` },
            { value: 'yok', label: 'Stopaj yok' },
            { value: 'diger', label: 'Diğer…' },
          ]}
          hint={
            stopajSecim === 'md18'
              ? 'GVK md. 18 kapsamındaki işler: yazılım, kitap, makale, çeviri eseri, resim, fotoğraf, senaryo gibi eserlerin yayımı, satışı veya haklarının devri.'
              : stopajSecim === 'yok'
                ? 'Karşı taraf stopaj sorumlusu değilse (ör. bireysel müşteri) kesinti yapılmaz; vergiyi yıllık beyannamede siz ödersiniz.'
                : 'Serbest meslek erbabına yapılan ödemelerde GVK md. 94/2-b gereği %20 kesinti yapılır.'
          }
        />
        {stopajSecim === 'diger' && (
          <NumberField
            id="smm-stopaj-ozel"
            label="Stopaj oranı"
            value={ozelStopaj}
            onChange={setOzelStopaj}
            suffix="%"
            error={stopajHata}
            hint="Cumhurbaşkanı kararıyla oran değişmişse buraya yazabilirsiniz."
          />
        )}

        <Segmented
          name="smm-tevkifat"
          label="KDV tevkifatı"
          value={tevkifat}
          onChange={setTevkifat}
          options={[
            { value: 'yok', label: 'Yok' },
            { value: '3', label: '3/10' },
            { value: '4', label: '4/10' },
            { value: '5', label: '5/10' },
            { value: '9', label: '9/10' },
          ]}
          hint={
            pay === 0
              ? 'Tevkifatlı işlemde müşteri, KDV’nin bir kısmını size ödemeyip kendisi vergi dairesine yatırır. Hizmetinizin türüne göre oranı seçin.'
              : undefined
          }
        />
        {kural && (
          <Callout kind="info">
            <strong>
              {kural.pay}/10 – {kural.ad}
            </strong>{' '}
            (KDV GUT {kural.bolum}). {kural.kapsam} Bu oran {kural.aliciMetni} karşı uygulanır.
          </Callout>
        )}

        {kismi && (
          <>
            <CheckboxField
              id="smm-sinir"
              label={`Tutar sınırını uygula (KDV dahil ${formatTL(sinir, 0)})`}
              checked={sinirUygula}
              onChange={setSinirUygula}
              hint="Kısmi tevkifat, tevkifata tabi işlemin KDV dahil bedeli bu sınırı aşarsa uygulanır. Aynı iş birden fazla makbuza bölünmüşse toplam bedel esas alınır; toplam sınırı aşıyorsa bu kutuyu kaldırın."
            />
            {sinirUygula && SINIR_YILLARI.length > 1 && (
              <SelectField
                id="smm-sinir-yil"
                label="Makbuz yılı"
                value={yil}
                onChange={setYil}
                options={SINIR_YILLARI.map((y) => ({
                  value: y,
                  label: `${y} (sınır ${formatTL(tevkifatSiniriOn(`${y}-06-30`).tutar, 0)})`,
                }))}
              />
            )}
          </>
        )}
      </div>

      <div class="calc-results">
        {sonuc && hesap ? (
          <>
            {yon === 'brut' ? (
              <ResultHero
                label="Hesabınıza yatacak (tahsil edilecek) toplam"
                value={formatTL(sonuc.tahsilat)}
                sub={
                  <>
                    Net ücret {formatTL(sonuc.net)} + tahsil edilecek KDV <strong>{formatTL(sonuc.tahsilEdilecekKdv)}</strong>
                  </>
                }
              />
            ) : (
              <ResultHero
                label="Makbuza yazılacak brüt ücret (KDV hariç)"
                value={formatTL(sonuc.brut)}
                sub={
                  <>
                    Müşteri size toplam <strong>{formatTL(sonuc.tahsilat)}</strong> ödeyecek
                  </>
                }
              />
            )}

            {yon === 'tahsilat' && hesap.adaylar.length > 1 && (
              <Callout kind="warning">
                <strong>Aynı tahsilatı veren iki makbuz var.</strong> Tevkifat sınırı yüzünden brüt ücret{' '}
                {formatTL(hesap.adaylar[0])} iken tevkifat uygulanmaz, {formatTL(hesap.adaylar[1])} iken uygulanır; ikisinde de hesabınıza{' '}
                {formatTL(tahsilat ?? 0)} yatar. Yukarıda ilkinin dökümü gösteriliyor.
              </Callout>
            )}
            {yon === 'tahsilat' && Math.abs(hesap.fark) > 0.01 && (
              <Callout kind="warning">
                Girdiğiniz tutara birebir karşılık gelen bir makbuz bulunamadı; en yakın sonuç {formatTL(sonuc.tahsilat)}.
              </Callout>
            )}

            <Breakdown title="Makbuz düzeni" rows={makbuzSatirlari} />

            {tevkifatMesaji && (
              <Callout kind="warning">
                <strong>KDV tevkifatı uygulanmaz.</strong> {tevkifatMesaji}
              </Callout>
            )}
            {sonuc.uygulananTevkifat > 0 && (
              <Callout kind="success">
                <strong>{sonuc.uygulananTevkifat}/10 KDV tevkifatı uygulanıyor.</strong> Tevkifata tabi tutar (KDV dahil{' '}
                {formatTL(sonuc.tevkifataTabiKdvDahil)}) koşulları sağlıyor. Makbuzda KDV’nin tamamı görünür, ancak yalnızca{' '}
                {formatTL(sonuc.tahsilEdilecekKdv)} kısmını tahsil edersiniz.
              </Callout>
            )}

            <Breakdown
              title="Müşteri tarafı"
              rows={[
                { label: 'Müşterinin size ödeyeceği', value: formatTL(sonuc.tahsilat) },
                {
                  label: 'Müşterinin vergi dairesine yatıracağı stopaj',
                  value: formatTL(sonuc.stopaj),
                  hint: 'Muhtasar beyanname ile; yıllık beyannamenizde vergi borcundan mahsup edilir.',
                },
                ...(sonuc.tevkifEdilenKdv > 0
                  ? [{ label: 'Müşterinin vergi dairesine yatıracağı KDV tevkifatı', value: formatTL(sonuc.tevkifEdilenKdv), hint: 'KDV-2 beyannamesi ile.' }]
                  : []),
                { label: 'Müşterinin toplam maliyeti (brüt + KDV)', value: formatTL(sonuc.kdvDahil), kind: 'total' },
              ]}
            />

            {yon !== 'brut' && (
              <Callout kind="info">
                <strong>Müşteriden ne isteyeyim?</strong> Makbuza {formatTL(sonuc.brut)} brüt ücret yazın. Müşteriye KDV dahil{' '}
                {formatTL(sonuc.kdvDahil)} tutarında fiyat verin; bunun {formatTL(sonuc.musteriVergiOdemesi)} kısmını (stopaj
                {sonuc.tevkifEdilenKdv > 0 ? ' ve tevkif edilen KDV' : ''}) müşteri vergi dairesine yatırır, size{' '}
                {formatTL(sonuc.tahsilat)} ödeyerek {formatTL(sonuc.net)} net ücretinizi alırsınız.
              </Callout>
            )}

            {cokKalem && (
              <DataTable
                caption="Kalem kalem döküm"
                columns={[
                  { key: 'ad', label: 'Kalem' },
                  { key: 'brut', label: 'Brüt' },
                  { key: 'oran', label: 'KDV oranı' },
                  { key: 'kdv', label: 'KDV' },
                  { key: 'dahil', label: 'KDV dahil' },
                ]}
                rows={sonuc.kalemler.map((k, i) => ({
                  ad: `${kalemler[i]?.ad.trim() || `Kalem ${i + 1}`}${pay > 0 && !k.tevkifatli ? ' (tevkifatsız)' : ''}`,
                  brut: formatTL(k.brut),
                  oran: formatPercent(k.kdvOrani),
                  kdv: formatTL(k.kdv),
                  dahil: formatTL(k.kdvDahil),
                }))}
                foot={{
                  ad: 'Toplam',
                  brut: formatTL(sonuc.brut),
                  oran: '',
                  kdv: formatTL(sonuc.kdv),
                  dahil: formatTL(sonuc.kdvDahil),
                }}
              />
            )}

            <ShareBar
              params={{
                y: yon,
                s: yon === 'tahsilat' ? null : kalemler.map((k) => `${k.tutar}:${oranOf(k)}${pay > 0 && !k.tevkifatli ? ':0' : ''}`).join(','),
                t: yon === 'tahsilat' ? tahsilat : null,
                to: yon === 'tahsilat' ? tahsilatOran : null,
                st: stopajOrani,
                m: musteri,
                tev: tevkifat === 'yok' ? null : tevkifat,
                sinir: kismi && !sinirUygula ? false : null,
                yil: kismi ? yil : null,
              }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için geçerli bir tutar, KDV oranı ve stopaj oranı girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
