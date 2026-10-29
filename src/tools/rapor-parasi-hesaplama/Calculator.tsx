import { useEffect, useMemo, useState } from 'preact/hooks';
import { pekSinirlariOn } from '../../data/params/sgk-sinirlar';
import { todayIsoTR } from '../../lib/finance';
import { formatNumber, formatTL } from '../../lib/format';
import { CheckboxField, DateField, NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { hesaplaRapor, validateRapor, type RaporTuru } from './calc';

type Giris = 'kolay' | 'dokum';

export default function Calculator() {
  const [tur, setTur] = useState<RaporTuru>('hastalik');
  const [tarih, setTarih] = useState('2026-10-29');
  const [giris, setGiris] = useState<Giris>('kolay');
  const [brut, setBrut] = useState<number | null>(50000);
  const [ay, setAy] = useState<number | null>(12);
  const [pekToplam, setPekToplam] = useState<number | null>(600000);
  const [primGun, setPrimGun] = useState<number | null>(360);
  const [birYil, setBirYil] = useState<number | null>(360);
  const [ayakta, setAyakta] = useState<number | null>(10);
  const [yatarak, setYatarak] = useState<number | null>(0);
  const [cogul, setCogul] = useState(false);

  useEffect(() => setTarih(todayIsoTR()), []);

  const analik = tur === 'analik';
  const ust = pekSinirlariOn(tarih).aylikUst;
  const kolayGecerli = brut !== null && brut > 0 && ay !== null && ay >= 1 && ay <= 12;
  const pek = giris === 'kolay' ? (kolayGecerli ? Math.min(brut!, ust) * ay! : null) : pekToplam;
  const gun = giris === 'kolay' ? (kolayGecerli ? ay! * 30 : null) : primGun;
  const sonBirYil = giris === 'kolay' ? gun : birYil;

  const errors = validateRapor({ tur, pek, gun, birYil: sonBirYil, ayakta, yatarak });
  if (giris === 'kolay' && !kolayGecerli) errors.kolay = 'Aylık brüt ücreti ve 1–12 arası ay sayısını girin.';
  const gecerli = Object.keys(errors).length === 0;

  const r = useMemo(
    () =>
      gecerli
        ? hesaplaRapor({
            tur,
            pekToplam: pek!,
            primGun: gun!,
            sonBirYilPrimGun: sonBirYil!,
            ayaktaGun: ayakta ?? 0,
            yatarakGun: yatarak ?? 0,
            cogulGebelik: cogul,
            tarih,
          })
        : null,
    [gecerli, tur, pek, gun, sonBirYil, ayakta, yatarak, cogul, tarih],
  );

  const ozet = r
    ? r.hakVar
      ? [
          `${analik ? 'Doğum izni ödeneği' : 'Rapor parası'}: ${formatTL(r.toplam)}`,
          `Günlük kazanç ${formatTL(r.gunlukKazanc)} · ayakta günlük ${formatTL(r.ayaktaGunluk)}${r.yatarakOdenenGun ? ` · yatarak günlük ${formatTL(r.yatarakGunluk)}` : ''}`,
          `Ödenen gün: ${r.ayaktaOdenenGun + r.yatarakOdenenGun}`,
        ].join('\n')
      : (r.engel ?? '')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <SelectField
          id="rp-tur"
          label="Rapor türü"
          value={tur}
          onChange={setTur}
          options={[
            { value: 'hastalik', label: 'Hastalık (istirahat raporu)' },
            { value: 'is-kazasi', label: 'İş kazası' },
            { value: 'meslek-hastaligi', label: 'Meslek hastalığı' },
            { value: 'analik', label: 'Doğum izni (analık)' },
          ]}
        />
        <DateField
          id="rp-tarih"
          label={analik ? 'Doğum tarihi (tahmini)' : 'Raporun başladığı tarih'}
          value={tarih}
          onChange={setTarih}
        />
        <Segmented
          name="rp-giris"
          label="Kazancınızı nasıl gireceksiniz?"
          value={giris}
          onChange={setGiris}
          options={[
            { value: 'kolay', label: 'Aylık brüt ücretle' },
            { value: 'dokum', label: 'SGK dökümünden' },
          ]}
        />
        {giris === 'kolay' ? (
          <div class="row-2">
            <NumberField id="rp-brut" label="Aylık brüt ücret" value={brut} onChange={setBrut} suffix="TL" error={errors.kolay} />
            <NumberField
              id="rp-ay"
              label="Son 12 ayda çalıştığınız ay"
              value={ay}
              onChange={setAy}
              suffix="ay"
              decimals={0}
              inputMode="numeric"
            />
          </div>
        ) : (
          <>
            <NumberField
              id="rp-pek"
              label="Önceki 12 aydaki prime esas kazanç toplamı"
              value={pekToplam}
              onChange={setPekToplam}
              suffix="TL"
              error={errors.pek}
              hint="e-Devlet “SGK Tescil ve Hizmet Dökümü”ndeki aylık kazançların toplamı."
            />
            <div class="row-2">
              <NumberField id="rp-gun" label="Bu kazançların prim günü" value={primGun} onChange={setPrimGun} suffix="gün" decimals={0} error={errors.gun} />
              <NumberField id="rp-biryil" label="Son 1 yıldaki prim günü" value={birYil} onChange={setBirYil} suffix="gün" decimals={0} error={errors.birYil} />
            </div>
          </>
        )}
        {analik ? (
          <CheckboxField id="rp-cogul" label="Çoğul gebelik (ikiz vb.)" checked={cogul} onChange={setCogul} hint="Doğum öncesi izin 2 hafta uzar." />
        ) : (
          <div class="row-2">
            <NumberField id="rp-ayakta" label="Ayakta tedavi (istirahat) günü" value={ayakta} onChange={setAyakta} suffix="gün" decimals={0} error={errors.ayakta} />
            <NumberField id="rp-yatarak" label="Hastanede yatarak tedavi günü" value={yatarak} onChange={setYatarak} suffix="gün" decimals={0} error={errors.yatarak} />
          </div>
        )}
      </div>

      <div class="calc-results">
        {r ? (
          r.hakVar ? (
            <>
              <ResultHero
                label={analik ? 'Doğum izni ödeneğiniz (toplam)' : 'Rapor parası (toplam)'}
                value={formatTL(r.toplam)}
                sub={
                  <>
                    {formatNumber(r.ayaktaOdenenGun + r.yatarakOdenenGun, 0)} gün için · SGK tarafından ödenir
                  </>
                }
              />
              <Breakdown
                rows={[
                  { label: 'Ödeneğe esas günlük kazanç', value: formatTL(r.gunlukKazanc), hint: '12 aylık prime esas kazanç ÷ prim günü' },
                  ...(r.ayaktaOdenenGun > 0
                    ? [{ label: `${analik ? 'Günlük ödenek' : 'Ayakta'} (2/3) × ${r.ayaktaOdenenGun} gün`, value: formatTL(r.ayaktaGunluk * r.ayaktaOdenenGun), hint: `Günlük ${formatTL(r.ayaktaGunluk)}` }]
                    : []),
                  ...(r.yatarakOdenenGun > 0
                    ? [{ label: `Yatarak (1/2) × ${r.yatarakOdenenGun} gün`, value: formatTL(r.yatarakGunluk * r.yatarakOdenenGun), hint: `Günlük ${formatTL(r.yatarakGunluk)}` }]
                    : []),
                  ...(r.odenmeyenGun > 0 ? [{ label: `İlk ${r.odenmeyenGun} gün (hastalıkta ödenmez)`, value: formatTL(0), kind: 'sub' as const }] : []),
                  { label: 'Toplam', value: formatTL(r.toplam), kind: 'total' },
                ]}
              />
              {r.sinirUygulandi && (
                <Callout kind="info">
                  Günlük kazancınıza sınır uygulandı:{' '}
                  {(gun ?? 0) < 180 && (tur === 'hastalik' || analik)
                    ? 'son 12 ayda 180 günden az prim olduğu için günlük kazanç, prime esas kazanç alt sınırının 2 katı ile sınırlanır.'
                    : 'günlük kazanç, prime esas kazanç üst sınırını geçemez.'}
                </Callout>
              )}
              {analik && (
                <Callout kind="info">
                  Doğum öncesi 8 (çoğul gebelikte 10) ve doğum sonrası 8 hafta için ödenir. Doktor onayıyla doğumdan önceki 3 haftaya
                  kadar çalışırsanız, çalıştığınız süre doğum sonrasına eklenir.
                </Callout>
              )}
              {tur === 'hastalik' && (
                <Callout kind="info">Raporlu günlerde işvereniniz ayrıca ücret öderse SGK ödeneği bu ödemeye göre düzenlenebilir.</Callout>
              )}
              <ShareBar params={{}} summary={ozet} />
            </>
          ) : (
            <Callout kind="warning">
              <strong>Ödenek hakkı görünmüyor.</strong> {r.engel}
            </Callout>
          )
        ) : (
          <ResultEmpty>Sonucu görmek için alanları doldurun.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
