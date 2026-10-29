import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { bsmvOranlari } from '../../data/params/serbest-meslek';
import { daysBetween, todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatNumber, formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, DateField, NumberField, Segmented, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { dateParam, enumParam, numParam, readParams } from '../../ui/url';
import { addDaysIso, isValidIsoDate } from '../ortalama-vade-hesaplama/calc';
import {
  hesaplaIskonto,
  validateAyar,
  validateSenet,
  type IskontoAyar,
  type IskontoYontemi,
  type OranDonemi,
  type YontemSonucu,
} from './calc';

type VadeTuru = 'tarih' | 'gun';
type GunEsasi = '365' | '360';

interface Senet {
  id: number;
  ad: string;
  nominal: number | null;
  vade: string;
  gun: number | null;
}

const VARSAYILAN_BSMV = bsmvOranlari.values.genelOran;

export default function Calculator() {
  const sayac = useRef(1);
  const yeniSenet = (nominal: number | null = null, vade = '', gun: number | null = null): Senet => ({
    id: sayac.current++,
    ad: '',
    nominal,
    vade,
    gun,
  });

  const [tarih, setTarih] = useState('');
  const [tur, setTur] = useState<VadeTuru>('tarih');
  const [senetler, setSenetler] = useState<Senet[]>(() => [yeniSenet(100000, '', 45), yeniSenet(60000, '', 90)]);
  const [oran, setOran] = useState<number | null>(45);
  const [donem, setDonem] = useState<OranDonemi>('yillik');
  const [esas, setEsas] = useState<GunEsasi>('365');
  const [yontem, setYontem] = useState<IskontoYontemi>('dis');
  const [bsmvUygula, setBsmvUygula] = useState(true);
  const [bsmvOrani, setBsmvOrani] = useState<number | null>(VARSAYILAN_BSMV);
  const [komisyonYuzde, setKomisyonYuzde] = useState<number | null>(0);
  const [sabitKomisyon, setSabitKomisyon] = useState<number | null>(0);

  useEffect(() => {
    const bugun = todayIsoTR();
    const p = readParams();
    const t = dateParam(p, 't') ?? bugun;
    setTarih(t);

    const s = p.get('s');
    const liste = s
      ? s
          .split(',')
          .map((part) => part.split(':'))
          .filter(([n, v]) => Number.isFinite(Number(n)) && isValidIsoDate(v))
          .slice(0, 50)
          .map(([n, v]) => yeniSenet(Number(n), v, daysBetween(t, v)))
      : [];
    if (liste.length > 0) setSenetler(liste);
    else setSenetler((list) => list.map((x) => ({ ...x, vade: addDaysIso(t, x.gun ?? 0) })));

    const tr = enumParam(p, 'tur', ['tarih', 'gun'] as const);
    if (tr) setTur(tr);
    const o = numParam(p, 'o');
    if (o !== null) setOran(o);
    if (p.get('d') === 'aylik') setDonem('aylik');
    const e = enumParam(p, 'e', ['365', '360'] as const);
    if (e) setEsas(e);
    if (p.get('y') === 'ic') setYontem('ic');
    const b = numParam(p, 'b');
    if (b !== null) {
      if (b === 0) setBsmvUygula(false);
      else setBsmvOrani(b);
    }
    const k = numParam(p, 'k');
    if (k !== null) setKomisyonYuzde(k);
    const sk = numParam(p, 'sk');
    if (sk !== null) setSabitKomisyon(sk);
  }, []);

  const guncelle = (id: number, patch: Partial<Senet>) => setSenetler((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const sil = (id: number) => setSenetler((l) => (l.length > 1 ? l.filter((x) => x.id !== id) : l));
  const ekle = () => setSenetler((l) => [...l, yeniSenet(null, '', null)]);

  /** Vadeye kalan gün: tarih girişinde iskonto tarihinden bulunur, gün girişinde doğrudan girilir. */
  const gunOf = (x: Senet): number | null =>
    tur === 'gun' ? x.gun : isValidIsoDate(x.vade) && isValidIsoDate(tarih) ? daysBetween(tarih, x.vade) : null;

  const turDegisti = (yeni: VadeTuru) => {
    if (yeni === 'gun') setSenetler((l) => l.map((x) => ({ ...x, gun: gunOf(x) })));
    else if (isValidIsoDate(tarih)) setSenetler((l) => l.map((x) => (x.gun !== null ? { ...x, vade: addDaysIso(tarih, Math.round(x.gun)) } : x)));
    setTur(yeni);
  };

  const gunDegisti = (id: number, gun: number | null) =>
    guncelle(id, { gun, vade: gun !== null && isValidIsoDate(tarih) ? addDaysIso(tarih, Math.round(gun)) : '' });

  const bsmvEtkin = bsmvUygula ? bsmvOrani : 0;
  const ayarHatalari = validateAyar({ oran, komisyonYuzde, sabitKomisyon, bsmvOrani: bsmvEtkin });
  const tarihHata = isValidIsoDate(tarih) ? undefined : 'Geçerli bir iskonto tarihi seçin.';
  const hatalar = senetler.map((x) => validateSenet(x.nominal, gunOf(x)));
  const gecerli = !tarihHata && Object.keys(ayarHatalari).length === 0 && hatalar.every((h) => !h.nominal && !h.gun);

  const sonuc = useMemo(() => {
    if (!gecerli) return null;
    const ayar: IskontoAyar = {
      oran: oran!,
      oranDonemi: donem,
      gunEsasi: esas === '360' ? 360 : 365,
      komisyonYuzde: komisyonYuzde!,
      sabitKomisyon: sabitKomisyon!,
      bsmvOrani: bsmvEtkin!,
    };
    return hesaplaIskonto(
      senetler.map((x) => ({ nominal: x.nominal!, gun: gunOf(x)!, ad: x.ad })),
      ayar,
    );
    // gunOf, tur ve tarih'e bağlı olduğu için bu bağımlılıklar yeterlidir
  }, [gecerli, oran, donem, esas, komisyonYuzde, sabitKomisyon, bsmvEtkin, senetler, tur, tarih]);

  const yontemAdi = yontem === 'dis' ? 'dış iskonto' : 'iç iskonto';
  const secili: YontemSonucu | null = sonuc ? sonuc[yontem] : null;
  const yuzde = (x: number | null) => (x === null ? '–' : formatPercent(x * 100, 2));
  const cokSenet = senetler.length > 1;
  const asim = sonuc ? sonuc.satirlar.some((s) => s.disAsim) : false;

  const ozet = sonuc && secili
    ? [
        `Nominal toplam: ${formatTL(sonuc.toplamNominal)}`,
        `İskonto (${yontemAdi}): ${formatTL(secili.iskonto)}`,
        ...(secili.komisyon > 0 ? [`Komisyon: ${formatTL(secili.komisyon)}`] : []),
        ...(secili.bsmv > 0 ? [`BSMV: ${formatTL(secili.bsmv)}`] : []),
        `Ele geçen: ${formatTL(secili.eleGecen)}`,
        `Yıllık gerçek maliyet (basit): ${yuzde(secili.basitMaliyet)}`,
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <DateField
          id="si-tarih"
          label="İskonto (bozdurma) tarihi"
          value={tarih}
          onChange={setTarih}
          error={tarihHata}
          hint="Vadeler bu tarihten itibaren sayılır. Varsayılan bugündür."
        />

        <Segmented
          name="si-tur"
          label="Vadeler nasıl girilsin?"
          value={tur}
          onChange={turDegisti}
          options={[
            { value: 'tarih', label: 'Vade tarihi' },
            { value: 'gun', label: 'Gün sayısı' },
          ]}
        />

        <div class="field">
          <span class="field__label">Senet ve çekler</span>
          <ul class="line-items">
            {senetler.map((x, i) => (
              <li class="line-item" key={x.id}>
                <div class="line-item__head">
                  <span>Senet / çek {i + 1}</span>
                  {cokSenet && (
                    <button type="button" class="line-item__remove" onClick={() => sil(x.id)} aria-label={`Senet ${i + 1}’i sil`}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
                <div class="line-item__fields">
                  <NumberField
                    id={`si-nominal-${x.id}`}
                    label="Nominal (yüz) değer"
                    value={x.nominal}
                    onChange={(v) => guncelle(x.id, { nominal: v })}
                    suffix="TL"
                    placeholder="ör. 100.000"
                    error={hatalar[i].nominal}
                  />
                  {tur === 'tarih' ? (
                    <DateField
                      id={`si-vade-${x.id}`}
                      label="Vade tarihi"
                      value={x.vade}
                      onChange={(v) => guncelle(x.id, { vade: v })}
                      error={hatalar[i].gun}
                      hint={gunOf(x) !== null && !hatalar[i].gun ? `${formatNumber(gunOf(x)!, 0)} gün sonra` : undefined}
                    />
                  ) : (
                    <NumberField
                      id={`si-gun-${x.id}`}
                      label="Vadeye kalan gün"
                      value={x.gun}
                      onChange={(v) => gunDegisti(x.id, v)}
                      suffix="gün"
                      decimals={0}
                      inputMode="numeric"
                      placeholder="ör. 60"
                      error={hatalar[i].gun}
                      hint={isValidIsoDate(x.vade) ? `Vade: ${formatDateTR(x.vade)}` : undefined}
                    />
                  )}
                </div>
                <TextField
                  id={`si-ad-${x.id}`}
                  label="Açıklama (isteğe bağlı)"
                  value={x.ad}
                  onChange={(v) => guncelle(x.id, { ad: v })}
                  placeholder="ör. Senet no, müşteri"
                />
              </li>
            ))}
          </ul>
          <button type="button" class="btn btn--small add-row" onClick={ekle}>
            + Senet / çek ekle
          </button>
        </div>

        <div class="calc-section-title">İskonto koşulları</div>
        <div class="row-2">
          <NumberField
            id="si-oran"
            label={donem === 'yillik' ? 'İskonto oranı (yıllık)' : 'İskonto oranı (aylık)'}
            value={oran}
            onChange={setOran}
            suffix="%"
            placeholder="ör. 45"
            error={ayarHatalari.oran}
            hint="Örnek değerdir; kurumun size verdiği oranı yazın."
          />
          <Segmented
            name="si-donem"
            label="Oran dönemi"
            value={donem}
            onChange={setDonem}
            options={[
              { value: 'yillik', label: 'Yıllık' },
              { value: 'aylik', label: 'Aylık' },
            ]}
          />
        </div>
        {donem === 'yillik' && (
          <Segmented
            name="si-esas"
            label="Gün esası"
            value={esas}
            onChange={setEsas}
            options={[
              { value: '365', label: '365 gün' },
              { value: '360', label: '360 gün' },
            ]}
            hint="Yıl 365 mi 360 gün sayılsın? Sözleşme ya da dekontunuzdaki esası seçin."
          />
        )}
        <Segmented
          name="si-yontem"
          label="Asıl sonuç hangi yönteme göre gösterilsin?"
          value={yontem}
          onChange={setYontem}
          options={[
            { value: 'dis', label: 'Dış iskonto (banka uygulaması)' },
            { value: 'ic', label: 'İç iskonto (peşin değer)' },
          ]}
          hint="İki yöntem de aşağıdaki karşılaştırma tablosunda yan yana gösterilir."
        />

        <CheckboxField
          id="si-bsmv"
          label="BSMV uygula"
          checked={bsmvUygula}
          onChange={setBsmvUygula}
          hint="Banka ve Sigorta Muameleleri Vergisi, bankanın iskonto ve komisyon gelirinden alınır; genellikle size yansıtılır."
        />
        {bsmvUygula && (
          <NumberField
            id="si-bsmv-oran"
            label="BSMV oranı"
            value={bsmvOrani}
            onChange={setBsmvOrani}
            suffix="%"
            error={ayarHatalari.bsmvOrani}
            hint={`Ticari işlemlerde genel oran %${VARSAYILAN_BSMV}’tir; bankanızın dekontundaki oran farklıysa onu yazın.`}
          />
        )}

        <Details summary="Komisyon ve masraf (isteğe bağlı)">
          <div class="calc-inputs">
            <div class="row-2">
              <NumberField
                id="si-komisyon"
                label="Komisyon (nominalin %’si)"
                value={komisyonYuzde}
                onChange={setKomisyonYuzde}
                suffix="%"
                error={ayarHatalari.komisyonYuzde}
              />
              <NumberField
                id="si-sabit"
                label="Senet başına sabit masraf"
                value={sabitKomisyon}
                onChange={setSabitKomisyon}
                suffix="TL"
                error={ayarHatalari.sabitKomisyon}
              />
            </div>
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {sonuc && secili ? (
          <>
            <ResultHero
              label={`Ele geçen tutar (${yontemAdi})`}
              value={formatTL(secili.eleGecen)}
              sub={
                <>
                  {formatTL(sonuc.toplamNominal)} nominal − <strong>{formatTL(secili.toplamKesinti)}</strong> kesinti
                </>
              }
            />

            {asim && (
              <Callout kind="danger">
                <strong>Dış iskonto nominal değeri aşıyor.</strong> Seçtiğiniz oran ve vade bir senette iskonto tutarını
                nominalin üzerine çıkarıyor; oranı, dönemi ya da gün sayısını kontrol edin.
              </Callout>
            )}

            <Breakdown
              rows={[
                { label: 'Nominal toplam', value: formatTL(sonuc.toplamNominal) },
                { label: `İskonto (${yontemAdi})`, value: `− ${formatTL(secili.iskonto)}`, kind: 'minus' },
                ...(secili.komisyon > 0 ? [{ label: 'Komisyon / masraf', value: `− ${formatTL(secili.komisyon)}`, kind: 'minus' as const }] : []),
                ...(secili.bsmv > 0
                  ? [{ label: `BSMV (${formatPercent(bsmvEtkin ?? 0)})`, value: `− ${formatTL(secili.bsmv)}`, kind: 'minus' as const }]
                  : []),
                { label: 'Ele geçen tutar', value: formatTL(secili.eleGecen), kind: 'total' },
              ]}
            />

            <StatGrid
              items={[
                { label: 'Yıllık gerçek maliyet (basit)', value: yuzde(secili.basitMaliyet) },
                { label: 'Yıllık gerçek maliyet (bileşik)', value: yuzde(secili.bilesikMaliyet) },
                { label: 'Ortalama vade', value: `${formatNumber(sonuc.ortalamaGun, 0)} gün` },
                { label: 'Kesinti / nominal', value: yuzde(sonuc.toplamNominal > 0 ? secili.toplamKesinti / sonuc.toplamNominal : null) },
              ]}
            />

            {secili.basitMaliyet !== null && oran !== null && (
              <Callout kind="info">
                Nominal oran {donem === 'yillik' ? 'yıllık' : 'aylık'} {formatPercent(oran)} görünse de, kesintiler ele geçen
                tutardan düşüldüğü ve BSMV ile komisyon eklendiği için kullandığınız paranın yıllık gerçek maliyeti basit
                hesapla <strong>{yuzde(secili.basitMaliyet)}</strong>, bileşik hesapla <strong>{yuzde(secili.bilesikMaliyet)}</strong>{' '}
                olur.
              </Callout>
            )}

            <DataTable
              caption="İç ve dış iskonto karşılaştırması"
              columns={[
                { key: 'kalem', label: 'Kalem' },
                { key: 'dis', label: 'Dış iskonto' },
                { key: 'ic', label: 'İç iskonto' },
                { key: 'fark', label: 'Fark' },
              ]}
              rows={[
                { k: 'iskonto', l: 'İskonto' },
                { k: 'komisyon', l: 'Komisyon / masraf' },
                { k: 'bsmv', l: 'BSMV' },
                { k: 'toplamKesinti', l: 'Toplam kesinti' },
                { k: 'eleGecen', l: 'Ele geçen' },
              ].map(({ k, l }) => {
                const d = sonuc.dis[k as 'iskonto'];
                const ic = sonuc.ic[k as 'iskonto'];
                return { kalem: l, dis: formatTL(d), ic: formatTL(ic), fark: formatTL(Math.round((ic - d) * 100) / 100) };
              }).concat([
                { kalem: 'Yıllık maliyet (basit)', dis: yuzde(sonuc.dis.basitMaliyet), ic: yuzde(sonuc.ic.basitMaliyet), fark: '' },
                { kalem: 'Yıllık maliyet (bileşik)', dis: yuzde(sonuc.dis.bilesikMaliyet), ic: yuzde(sonuc.ic.bilesikMaliyet), fark: '' },
              ])}
            />

            {cokSenet && (
              <DataTable
                caption={`Senet senet döküm (${yontemAdi})`}
                columns={[
                  { key: 'no', label: 'Senet' },
                  { key: 'nominal', label: 'Nominal' },
                  { key: 'gun', label: 'Gün' },
                  { key: 'iskonto', label: 'İskonto' },
                  { key: 'ele', label: 'Ele geçen' },
                ]}
                rows={sonuc.satirlar.map((s, i) => ({
                  no: s.ad || `${i + 1}`,
                  nominal: formatTL(s.nominal),
                  gun: formatNumber(s.gun, 0),
                  iskonto: formatTL(s[yontem].iskonto),
                  ele: formatTL(s[yontem].eleGecen),
                }))}
                foot={{
                  no: 'Toplam',
                  nominal: formatTL(sonuc.toplamNominal),
                  gun: formatNumber(sonuc.ortalamaGun, 0),
                  iskonto: formatTL(secili.iskonto),
                  ele: formatTL(secili.eleGecen),
                }}
              />
            )}

            <ShareBar
              params={{
                t: tarih,
                tur,
                s: senetler.map((x) => `${x.nominal}:${x.vade}`).join(','),
                o: oran,
                d: donem === 'aylik' ? 'aylik' : null,
                e: donem === 'yillik' && esas === '360' ? esas : null,
                y: yontem === 'ic' ? 'ic' : null,
                b: bsmvUygula ? bsmvOrani : 0,
                k: komisyonYuzde && komisyonYuzde > 0 ? komisyonYuzde : null,
                sk: sabitKomisyon && sabitKomisyon > 0 ? sabitKomisyon : null,
              }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için iskonto tarihi, oran ve her senet için geçerli bir nominal tutar ile vade girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
