import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { kartTaksitSinirlari, type KartHarcamaGrubu } from '../../data/params/kredi';
import { annualFromMonthly } from '../../lib/finance';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField } from '../../ui/fields';
import { Callout, DataTable, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import {
  karsilastir,
  kartTaksitKontrol,
  pesinFiyatHesapla,
  senaryoTablosu,
  validateFiyat,
  validateGun,
  validateIndirim,
  validateOran,
  validateSecenek,
  type SecenekSonucu,
  type TaksitGirisi,
} from './calc';

type PesinGiris = 'indirim' | 'tutar';
type IlkOdeme = '0' | '10' | '30' | '40' | 'ozel';

const ILK_ODEME_SECENEKLERI: { value: IlkOdeme; label: string }[] = [
  { value: '30', label: '1 ay sonra' },
  { value: '40', label: 'Kart: hesap kesiminden hemen sonra alışveriş (~40 gün)' },
  { value: '10', label: 'Kart: hesap kesiminden hemen önce alışveriş (~10 gün)' },
  { value: '0', label: 'Alışveriş günü (ilk taksit peşin)' },
  { value: 'ozel', label: 'Gün sayısını kendim gireceğim' },
];

const GIRIS_SECENEKLERI: { value: TaksitGirisi; label: string }[] = [
  { value: 'vadeFarki', label: 'Vade farkı (%) — farksızsa 0' },
  { value: 'toplam', label: 'Taksitli toplam fiyat' },
  { value: 'taksit', label: 'Aylık taksit tutarı' },
];
const GIRIS_KOD: Record<TaksitGirisi, string> = { vadeFarki: 'v', toplam: 't', taksit: 'a' };
const KOD_GIRIS: Record<string, TaksitGirisi> = { v: 'vadeFarki', t: 'toplam', a: 'taksit' };

const GRUP_SECENEKLERI = kartTaksitSinirlari.values.gruplar.map((g) => ({
  value: g.id,
  label: g.azami === 0 ? `${g.ad} — taksit yok` : `${g.ad} — en fazla ${g.azami} taksit`,
}));
const GRUP_IDLERI = kartTaksitSinirlari.values.gruplar.map((g) => g.id);

const SENARYO_ORANLARI = [0, 1, 2, 3, 4, 5];

interface Satir {
  id: number;
  sayi: number | null;
  giris: TaksitGirisi;
  deger: number | null;
}

/** Başa baş oranını sade bir cümleyle açıklar. */
function basabasCumlesi(s: SecenekSonucu): string {
  const ad = `${s.sayi} taksit`;
  if (s.basabasAylik === null) return `${ad}: başa baş oranı hesaplanamadı.`;
  if (s.basabasAylik < -1e-6)
    return `${ad}: taksitlerin toplamı peşin fiyattan düşük; getiri ya da enflasyon sıfır olsa bile taksitli ödeme daha ucuza gelir.`;
  if (s.basabasAylik < 1e-6)
    return `${ad}: taksit toplamı peşin fiyata eşit; paranız sıfırın üzerinde getiri sağladığı (ya da fiyatlar arttığı) sürece taksit daha ucuza gelir.`;
  return `${ad}: aylık getiri veya enflasyon %${formatNumber(s.basabasAylik, 2)} (yıllık bileşik %${formatNumber(s.basabasYillik ?? 0, 1)}) üzerinde olursa taksit, peşinden daha ucuza gelir; altında kalırsa peşin daha ucuzdur. Taksitli ödeme, bu oranla borçlanmaya eşdeğerdir.`;
}

export default function Calculator() {
  const sayac = useRef(1);
  const yeniSatir = (sayi: number | null, giris: TaksitGirisi, deger: number | null): Satir => ({ id: sayac.current++, sayi, giris, deger });

  const [pesinGiris, setPesinGiris] = useState<PesinGiris>('indirim');
  const [etiket, setEtiket] = useState<number | null>(30_000);
  const [indirim, setIndirim] = useState<number | null>(10);
  const [pesinTutar, setPesinTutar] = useState<number | null>(27_000);
  const [satirlar, setSatirlar] = useState<Satir[]>(() => [yeniSatir(3, 'vadeFarki', 0), yeniSatir(6, 'vadeFarki', 0), yeniSatir(12, 'vadeFarki', 15)]);
  const [ilkOdeme, setIlkOdeme] = useState<IlkOdeme>('30');
  const [ozelGun, setOzelGun] = useState<number | null>(30);
  const [oran, setOran] = useState<number | null>(2.5);
  const [kart, setKart] = useState(true);
  const [grup, setGrup] = useState<KartHarcamaGrubu>('genel');

  useEffect(() => {
    // ?e=30000&ind=10&s=3:v:0,6:v:0,12:v:15&o=2.5&ig=30&g=mobilya
    const p = readParams();
    const n = (k: string, set: (v: number) => void) => {
      const v = numParam(p, k);
      if (v !== null) set(v);
    };
    n('e', setEtiket);
    n('ind', setIndirim);
    const pt = numParam(p, 'p');
    if (pt !== null) {
      setPesinGiris('tutar');
      setPesinTutar(pt);
    }
    n('o', setOran);
    const ig = p.get('ig');
    if (ig !== null) {
      if (['0', '10', '30', '40'].includes(ig)) setIlkOdeme(ig as IlkOdeme);
      else if (Number.isFinite(Number(ig))) {
        setIlkOdeme('ozel');
        setOzelGun(Number(ig));
      }
    }
    if (boolParam(p, 'kk') === false) setKart(false);
    const g = enumParam(p, 'g', GRUP_IDLERI);
    if (g) setGrup(g);
    const s = p.get('s');
    if (s) {
      const list = s
        .split(',')
        .map((x) => x.split(':'))
        .filter(([a, kod, d]) => Number.isFinite(Number(a)) && kod in KOD_GIRIS && Number.isFinite(Number(d)))
        .slice(0, 8)
        .map(([a, kod, d]) => yeniSatir(Number(a), KOD_GIRIS[kod], Number(d)));
      if (list.length > 0) setSatirlar(list);
    }
  }, []);

  const guncelle = (id: number, patch: Partial<Satir>) => setSatirlar((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const sil = (id: number) => setSatirlar((l) => (l.length > 1 ? l.filter((s) => s.id !== id) : l));
  const ekle = () =>
    setSatirlar((l) => (l.length >= 8 ? l : [...l, yeniSatir(Math.min(36, (l[l.length - 1]?.sayi ?? 6) + 3), 'vadeFarki', l[l.length - 1]?.deger ?? 0)]));

  const indirimHata = pesinGiris === 'indirim' ? validateIndirim(indirim) : null;
  const pesin =
    pesinGiris === 'indirim' ? (etiket !== null && indirim !== null && !indirimHata ? pesinFiyatHesapla(etiket, indirim) : null) : pesinTutar;
  const fiyatHata = validateFiyat(etiket, pesin);
  const satirHatalari = satirlar.map((s) => validateSecenek(s.sayi, s.giris, s.deger));
  const oranHata = validateOran(oran);
  const gun = ilkOdeme === 'ozel' ? ozelGun : Number(ilkOdeme);
  const gunHata = ilkOdeme === 'ozel' ? validateGun(ozelGun) : null;
  const gecerli =
    !indirimHata && Object.keys(fiyatHata).length === 0 && satirHatalari.every((h) => !h.sayi && !h.deger) && !oranHata && !gunHata;

  const girdi = gecerli
    ? {
        etiket: etiket!,
        pesin: pesin!,
        aylikOran: oran!,
        ilkGun: gun!,
        secenekler: satirlar.map((s) => ({ sayi: s.sayi!, giris: s.giris, deger: s.deger! })),
      }
    : null;
  const sonuc = useMemo(() => (girdi ? karsilastir(girdi) : null), [JSON.stringify(girdi)]);
  const senaryo = useMemo(
    () => (girdi ? senaryoTablosu(girdi, SENARYO_ORANLARI.includes(girdi.aylikOran) ? SENARYO_ORANLARI : [...SENARYO_ORANLARI, girdi.aylikOran].sort((a, b) => a - b)) : null),
    [JSON.stringify(girdi)],
  );

  const sinirlar = kart ? satirlar.map((s) => (s.sayi !== null && s.sayi > 0 ? kartTaksitKontrol(grup, s.sayi) : null)) : [];
  const sinirAsanlar = sinirlar.map((k, i) => (k && !k.uygun ? satirlar[i].sayi : null)).filter((x): x is number => x !== null);
  const grupBilgi = kartTaksitSinirlari.values.gruplar.find((g) => g.id === grup)!;

  const yillikKarsilik = oran !== null && !oranHata ? annualFromMonthly(oran / 100) * 100 : null;

  const ozet =
    sonuc && girdi
      ? [
          `Peşin fiyat: ${formatTL(girdi.pesin)} (etiket ${formatTL(girdi.etiket)})`,
          `Varsayım: aylık %${formatNumber(girdi.aylikOran)} getiri/enflasyon, ilk taksit ${girdi.ilkGun} gün sonra`,
          ...sonuc.secenekler.map(
            (s) =>
              `${s.sayi} taksit × ${formatTL(s.taksit)} = ${formatTL(s.toplam)} · bugünkü değer ${formatTL(s.bugunkuDeger)} · başa baş aylık ${s.basabasAylik === null ? '–' : formatPercent(s.basabasAylik)}`,
          ),
          sonuc.enUcuz === -1 ? 'Bugünkü değerle en ucuz: peşin' : `Bugünkü değerle en ucuz: ${sonuc.secenekler[sonuc.enUcuz].sayi} taksit`,
        ].join('\n')
      : '';

  return (
    <>
      <div class="calc-grid">
        <div class="calc-inputs">
          <NumberField id="tp-etiket" label="Etiket (taksitli satış) fiyatı" value={etiket} onChange={setEtiket} suffix="TL" error={fiyatHata.etiket} />
          <Segmented
            name="tp-pesin-giris"
            label="Peşin fiyat"
            value={pesinGiris}
            onChange={setPesinGiris}
            options={[
              { value: 'indirim', label: 'Peşin indirimi (%)' },
              { value: 'tutar', label: 'Peşin fiyatı biliyorum' },
            ]}
          />
          {pesinGiris === 'indirim' ? (
            <NumberField
              id="tp-indirim"
              label="Peşin ödemede indirim"
              value={indirim}
              onChange={setIndirim}
              suffix="%"
              error={indirimHata ?? fiyatHata.pesin}
              hint={pesin !== null && !indirimHata ? `Peşin fiyat: ${formatTL(pesin)}` : 'İndirim yoksa 0 yazın.'}
            />
          ) : (
            <NumberField id="tp-pesin" label="Peşin fiyat" value={pesinTutar} onChange={setPesinTutar} suffix="TL" error={fiyatHata.pesin} />
          )}

          <div class="field">
            <span class="field__label">Taksit seçenekleri</span>
            <ul class="line-items">
              {satirlar.map((s, i) => (
                <li class="line-item" key={s.id}>
                  <div class="line-item__head">
                    <span>Seçenek {i + 1}</span>
                    {satirlar.length > 1 && (
                      <button type="button" class="line-item__remove" onClick={() => sil(s.id)} aria-label={`Seçenek ${i + 1}’i sil`}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div class="line-item__fields">
                    <NumberField
                      id={`tp-sayi-${s.id}`}
                      label="Taksit sayısı"
                      value={s.sayi}
                      onChange={(v) => guncelle(s.id, { sayi: v })}
                      suffix="ay"
                      decimals={0}
                      inputMode="numeric"
                      error={satirHatalari[i].sayi}
                    />
                    <SelectField id={`tp-giris-${s.id}`} label="Nasıl gireceksiniz?" value={s.giris} onChange={(v) => guncelle(s.id, { giris: v })} options={GIRIS_SECENEKLERI} />
                  </div>
                  <NumberField
                    id={`tp-deger-${s.id}`}
                    label={s.giris === 'vadeFarki' ? 'Etiket fiyatına vade farkı' : s.giris === 'toplam' ? 'Taksitli toplam fiyat' : 'Aylık taksit'}
                    value={s.deger}
                    onChange={(v) => guncelle(s.id, { deger: v })}
                    suffix={s.giris === 'vadeFarki' ? '%' : 'TL'}
                    error={satirHatalari[i].deger}
                    hint={s.giris === 'vadeFarki' && s.deger === 0 ? 'Vade farksız: taksitlerin toplamı etiket fiyatına eşit.' : undefined}
                  />
                  {kart && sinirlar[i] && !sinirlar[i]!.uygun && (
                    <p class="field__error">
                      {sinirlar[i]!.yasak ? 'Bu harcama grubunda kartla taksit yapılamaz.' : `Bu harcama grubunda kartla en fazla ${sinirlar[i]!.azami} taksit yapılabilir.`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {satirlar.length < 8 && (
              <button type="button" class="btn btn--small add-row" onClick={ekle}>
                + Seçenek ekle
              </button>
            )}
          </div>

          <SelectField
            id="tp-ilk"
            label="İlk taksit ne zaman ödenir?"
            value={ilkOdeme}
            onChange={setIlkOdeme}
            options={ILK_ODEME_SECENEKLERI}
            hint="Sonraki taksitler birer ay arayla ödenir. İlk ödemeye kadar geçen süre uzadıkça taksit avantajı artar."
          />
          {ilkOdeme === 'ozel' && (
            <NumberField id="tp-gun" label="İlk taksite kalan gün" value={ozelGun} onChange={setOzelGun} suffix="gün" decimals={0} inputMode="numeric" error={gunHata} />
          )}

          <NumberField
            id="tp-oran"
            label="Paranızın aylık getirisi veya beklenen aylık enflasyon"
            value={oran}
            onChange={setOran}
            suffix="%"
            error={oranHata}
            hint={
              yillikKarsilik !== null
                ? `Varsayılan değer örnektir. Aylık %${formatNumber(oran!, 2)} ≈ yıllık bileşik %${formatNumber(yillikKarsilik, 1)}. Mevduat için vergi sonrası net getiriyi yazın.`
                : 'Mevduat için vergi sonrası net getiriyi yazın.'
            }
          />

          <CheckboxField
            id="tp-kart"
            label="Kredi kartıyla taksit (BDDK taksit sınırlarını kontrol et)"
            checked={kart}
            onChange={setKart}
            hint="Mağaza kredisi veya alışveriş kredisinde kart sınırları uygulanmaz."
          />
          {kart && <SelectField id="tp-grup" label="Harcama grubu" value={grup} onChange={setGrup} options={GRUP_SECENEKLERI} />}
        </div>

        <div class="calc-results">
          {sonuc && girdi ? (
            <>
              {sonuc.enUcuz === -1 ? (
                <ResultHero
                  label="Bugünkü değerle en ucuz seçenek: Peşin"
                  value={formatTL(girdi.pesin)}
                  sub={(() => {
                    const yakin = sonuc.secenekler.reduce((a, b) => (b.bugunkuDeger < a.bugunkuDeger ? b : a));
                    return (
                      <>
                        En yakın taksit seçeneği {yakin.sayi} taksit: bugünkü değeri {formatTL(yakin.bugunkuDeger)} (
                        <strong>{formatTL(yakin.bdFark)}</strong> fazla)
                      </>
                    );
                  })()}
                />
              ) : (
                <ResultHero
                  label={`Bugünkü değerle en ucuz seçenek: ${sonuc.secenekler[sonuc.enUcuz].sayi} taksit`}
                  value={formatTL(sonuc.secenekler[sonuc.enUcuz].bugunkuDeger)}
                  sub={
                    <>
                      Peşin fiyattan <strong>{formatTL(-sonuc.secenekler[sonuc.enUcuz].bdFark)}</strong> düşük · aylık %
                      {formatNumber(girdi.aylikOran)} varsayımıyla
                    </>
                  }
                />
              )}

              <DataTable
                columns={[
                  { key: 'ad', label: 'Seçenek' },
                  { key: 'taksit', label: 'Aylık taksit' },
                  { key: 'toplam', label: 'Toplam' },
                  { key: 'fark', label: 'Peşine göre' },
                  { key: 'bd', label: 'Bugünkü değer' },
                  { key: 'bb', label: 'Başa baş (aylık)' },
                ]}
                rows={[
                  { ad: 'Peşin', taksit: '–', toplam: formatTL(girdi.pesin), fark: '–', bd: formatTL(girdi.pesin), bb: '–' },
                  ...sonuc.secenekler.map((s, i) => ({
                    ad: `${s.sayi} taksit${i === sonuc.enUcuz ? ' ✓' : ''}`,
                    taksit: formatTL(s.taksit),
                    toplam: formatTL(s.toplam),
                    fark: `${s.pesineGoreFark >= 0 ? '+' : ''}${formatTL(s.pesineGoreFark)} (${s.pesineGoreOran >= 0 ? '+' : ''}%${formatNumber(s.pesineGoreOran, 1)})`,
                    bd: formatTL(s.bugunkuDeger),
                    bb: s.basabasAylik === null ? '–' : `%${formatNumber(s.basabasAylik, 2)}`,
                  })),
                ]}
              />

              <Callout kind="info">
                <ul>
                  {sonuc.secenekler.map((s) => (
                    <li key={s.sayi}>{basabasCumlesi(s)}</li>
                  ))}
                </ul>
              </Callout>

              {kart && sinirAsanlar.length > 0 && (
                <Callout kind="warning">
                  <strong>Taksit sınırı:</strong> “{grupBilgi.ad}” grubunda{' '}
                  {grupBilgi.azami === 0 ? 'kredi kartıyla taksit yapılamaz' : `kredi kartıyla en fazla ${grupBilgi.azami} taksit yapılabilir`}.{' '}
                  {sinirAsanlar.join(', ')} taksitli seçenek kartla sunulamaz; satıcı bu taksitleri ancak kendi kredisi veya alışveriş kredisiyle
                  verebilir.
                </Callout>
              )}

              <Callout kind="info">
                <strong>Bugünkü değer ne demek?</strong> Taksitleri ödeyeceğiniz parayı bugün aylık %{formatNumber(girdi.aylikOran)}
                getiriyle değerlendirebiliyorsanız (ya da fiyatlar bu hızla artıyorsa), gelecekteki her taksit bugün daha az değerdedir.
                Peşin fiyat, taksitlerin bugünkü değerinden yüksekse taksit daha ucuza gelir.
              </Callout>

              <ShareBar
                params={{
                  e: etiket,
                  ind: pesinGiris === 'indirim' ? indirim : null,
                  p: pesinGiris === 'tutar' ? pesinTutar : null,
                  s: satirlar.map((s) => `${s.sayi}:${GIRIS_KOD[s.giris]}:${s.deger}`).join(','),
                  o: oran,
                  ig: ilkOdeme === 'ozel' ? ozelGun : ilkOdeme === '30' ? null : ilkOdeme,
                  kk: kart ? null : false,
                  g: kart && grup !== 'genel' ? grup : null,
                }}
                summary={ozet}
              />
            </>
          ) : (
            <ResultEmpty>Sonucu görmek için fiyatları, her seçeneğin taksit sayısını ve aylık getiri varsayımını girin.</ResultEmpty>
          )}
        </div>
      </div>

      {sonuc && girdi && senaryo && (
        <section class="calc-wide" aria-label="Senaryo tablosu">
          <p class="calc-section-title">Farklı getiri / enflasyon varsayımlarında bugünkü değer</p>
          <DataTable
            columns={[
              { key: 'oran', label: 'Aylık oran' },
              { key: 'pesin', label: 'Peşin' },
              ...sonuc.secenekler.map((s, i) => ({ key: `s${i}`, label: `${s.sayi} taksit` })),
            ]}
            rows={senaryo.map((r) => {
              const enDusuk = Math.min(girdi.pesin, ...r.degerler);
              const row: Record<string, string> = {
                oran: `%${formatNumber(r.oran)}${r.oran === girdi.aylikOran ? ' (sizin)' : ''}`,
                pesin: `${formatTL(girdi.pesin)}${girdi.pesin === enDusuk ? ' ✓' : ''}`,
              };
              r.degerler.forEach((d, i) => {
                row[`s${i}`] = `${formatTL(d)}${d === enDusuk && d < girdi.pesin ? ' ✓' : ''}`;
              });
              return row;
            })}
          />
          <p class="field__hint">✓ işareti her satırda bugünkü değeri en düşük seçeneği gösterir. Oran %0 satırı, taksitlerin düz toplamıdır.</p>
          <Callout kind="info">
            <strong>Kredi kartında ödeme günü etkisi:</strong> Kartla yapılan taksitli alışverişte ilk taksit, alışverişten sonraki ilk
            hesap kesiminde ekstreye yansır ve son ödeme gününde ödenir. Alışverişi hesap kesiminden hemen sonra yaparsanız ilk ödemeye
            kadar yaklaşık 40 gün, hemen önce yaparsanız yaklaşık 10 gün geçer. Ayrıca taksitli alışverişin toplam tutarı, ilk günden kart
            limitinizden düşülür.
          </Callout>
        </section>
      )}
    </>
  );
}
