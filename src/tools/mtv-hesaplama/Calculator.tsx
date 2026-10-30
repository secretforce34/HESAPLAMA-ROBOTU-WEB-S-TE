import { useState } from 'preact/hooks';
import { mtvTarifesi } from '../../data/params/mtv';
import { formatTL } from '../../lib/format';
import { NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { hesaplaMtv, otomobilSatiri, validateMtv, YAS_GRUPLARI, type AracTuru } from './calc';

const p = mtvTarifesi.values;
const tl = (n: number) => n.toLocaleString('tr-TR');

export default function Calculator() {
  const [tur, setTur] = useState<AracTuru>('otomobil');
  const [motor, setMotor] = useState<'yakit' | 'elektrik'>('yakit');
  const [olcu, setOlcu] = useState<number | null>(1598);
  const [modelYili, setModelYili] = useState<number | null>(2024);
  const [tescil, setTescil] = useState<'yeni' | 'eski'>('yeni');
  const [kademe, setKademe] = useState('2');

  const elektrikli = motor === 'elektrik';
  const otomobil = tur === 'otomobil';
  const errors = validateMtv({ olcu, modelYili });
  const tamam = Object.keys(errors).length === 0;

  // Değer kademesi seçenekleri seçilen satıra göre (iki ya da üç kademe)
  const satir = otomobil && olcu ? p.otomobil[otomobilSatiri(olcu, elektrikli)] : null;
  const kademeSecenekleri = satir
    ? satir.kademeler.map((k, j) => {
        const alt = j === 0 ? null : satir.kademeler[j - 1].ustDeger;
        const ad = alt === null ? `${tl(k.ustDeger!)} TL’ye kadar` : k.ustDeger === null ? `${tl(alt)} TL üstü` : `${tl(alt)} – ${tl(k.ustDeger)} TL`;
        return { value: String(j), label: ad };
      })
    : [];
  const kademeNo = Math.min(Number(kademe), Math.max(0, kademeSecenekleri.length - 1));

  const r = tamam ? hesaplaMtv({ tur, elektrikli, olcu: olcu!, modelYili: modelYili!, yeniTescil: tescil === 'yeni', kademe: kademeNo }) : null;

  const ozet = r
    ? r.vergiDisi
      ? 'Bu taşıt MTV tarifesi dışında.'
      : [`${p.yil} yıllık MTV: ${formatTL(r.yillik)}`, `Ocak ve Temmuz taksiti: ${formatTL(r.taksit)}`, `${r.satir}, ${r.yas} yaş`].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="mtv-tur"
          label="Taşıt"
          value={tur}
          onChange={setTur}
          options={[
            { value: 'otomobil', label: 'Otomobil, arazi taşıtı' },
            { value: 'motosiklet', label: 'Motosiklet' },
          ]}
        />
        <Segmented
          name="mtv-motor"
          label="Motor"
          value={motor}
          onChange={setMotor}
          options={[
            { value: 'yakit', label: 'Benzin, dizel, LPG, hibrit' },
            { value: 'elektrik', label: 'Sadece elektrikli' },
          ]}
          hint="Hibrit araçlar elektrikli indiriminden yararlanmaz."
        />
        <div class="row-2">
          <NumberField
            id="mtv-olcu"
            label={elektrikli ? 'Motor gücü' : 'Silindir hacmi'}
            value={olcu}
            onChange={setOlcu}
            suffix={elektrikli ? 'kW' : 'cm³'}
            decimals={0}
            error={errors.olcu}
            hint={elektrikli ? 'Ruhsattaki P.2 alanı.' : 'Ruhsattaki P.1 alanı.'}
          />
          <NumberField
            id="mtv-model"
            label="Model yılı"
            value={modelYili}
            onChange={setModelYili}
            decimals={0}
            error={errors.modelYili}
            hint="Ruhsattaki D.4 alanı."
          />
        </div>
        {otomobil && (
          <>
            <Segmented
              name="mtv-tescil"
              label="İlk tescil tarihi"
              value={tescil}
              onChange={setTescil}
              options={[
                { value: 'yeni', label: '1 Ocak 2018 ve sonrası' },
                { value: 'eski', label: '2017 ve öncesi' },
              ]}
            />
            {tescil === 'yeni' && (
              <SelectField
                id="mtv-kademe"
                label="Taşıt değeri kademesi"
                value={String(kademeNo)}
                options={kademeSecenekleri}
                onChange={setKademe}
                hint="Aracın ilk tescil edildiği yıldaki vergisiz satış bedeline göre belirlenir ve sonra değişmez. Tutarlar 2026 sınırlarıdır; bilmiyorsanız aşağıdaki tablo tüm kademeleri gösterir."
              />
            )}
          </>
        )}
      </div>

      <div class="calc-results">
        {r ? (
          r.vergiDisi ? (
            <Callout kind="success">
              {elektrikli ? '6 kW ve altındaki elektrikli motosikletler' : '100 cm³’ün altındaki motosikletler'} MTV tarifesinde yer almaz; vergi
              ödenmez.
            </Callout>
          ) : (
            <>
              <ResultHero
                label={`${p.yil} yılı motorlu taşıtlar vergisi`}
                value={formatTL(r.yillik)}
                sub={
                  <>
                    Ocak ve Temmuz’da iki taksit: <strong>{formatTL(r.taksit)}</strong>
                  </>
                }
              />
              <Breakdown
                rows={[
                  { label: 'Tarife satırı', value: r.satir.replace(/^(Otomobil|Motosiklet) /, '') },
                  { label: 'Aracın yaşı', value: `${r.yas} (${YAS_GRUPLARI[r.yasGrubu]})`, hint: 'Model yılında 1 yaşında sayılır' },
                  ...(elektrikli
                    ? [
                        { label: 'Tarifedeki tutar', value: formatTL(r.tamTutar) },
                        { label: `Elektrikli araç: tutarın %${p.elektrikliOran}’i`, value: formatTL(r.yillik), kind: 'minus' as const },
                      ]
                    : []),
                  { label: '1. taksit (31 Ocak’a kadar)', value: formatTL(r.taksit) },
                  { label: '2. taksit (31 Temmuz’a kadar)', value: formatTL(r.taksit) },
                  { label: 'Yıllık toplam', value: formatTL(r.yillik), kind: 'total' as const },
                ]}
              />
              {r.kademeler.length > 1 && (
                <DataTable
                  caption="Taşıt değeri kademelerine göre yıllık MTV"
                  columns={[
                    { key: 'k', label: 'Taşıt değeri (ilk tescil)' },
                    { key: 'v', label: 'Yıllık MTV' },
                  ]}
                  rows={r.kademeler.map((k, j) => ({ k: j === kademeNo ? <strong>{k.ad} ✓</strong> : k.ad, v: formatTL(k.yillik) }))}
                />
              )}
              {r.sonrakiGrup && (
                <Callout kind="info">
                  {r.sonrakiGrup.yil} yılında aracınız {YAS_GRUPLARI[r.yasGrubu + 1]} grubuna geçer; bugünkü tarifeyle yıllık{' '}
                  {formatTL(r.sonrakiGrup.yillik)} olur. Tutarlar her yıl yeniden değerleme oranında artırılır.
                </Callout>
              )}
              <Callout kind="info">
                MTV borcu ödenmeden araç satılamaz. Süresinde ödenmeyen taksite gecikme zammı işler. Engellilik oranı %90 ve üzeri olanların ve
                engelli kullanımına uygun taşıtlar, şartlarıyla MTV’den muaftır.
              </Callout>
              <ShareBar params={{}} summary={ozet} />
            </>
          )
        ) : (
          <ResultEmpty>Sonucu görmek için alanları doldurun.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
