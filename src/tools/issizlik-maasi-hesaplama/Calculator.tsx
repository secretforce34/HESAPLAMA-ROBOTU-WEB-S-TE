import { useEffect, useMemo, useState } from 'preact/hooks';
import { todayIsoTR } from '../../lib/finance';
import { formatNumber, formatTL } from '../../lib/format';
import { CheckboxField, DateField, NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { hesaplaIssizlik, validateIssizlik } from './calc';

type Giris = 'ortalama' | 'ay';
type Neden =
  | 'isveren-fesih'
  | 'haklı-fesih'
  | 'saglik'
  | 'belirli-sure'
  | 'kapanma'
  | 'zorlayici'
  | 'istifa'
  | 'ahlak';

const NEDENLER: { value: Neden; label: string; uygun: boolean }[] = [
  { value: 'isveren-fesih', label: 'İşveren sözleşmemi feshetti (geçerli/geçersiz neden)', uygun: true },
  { value: 'haklı-fesih', label: 'Ben haklı nedenle feshettim (ücret ödenmedi, mobbing vb.)', uygun: true },
  { value: 'saglik', label: 'Sağlık nedeniyle sona erdi', uygun: true },
  { value: 'belirli-sure', label: 'Belirli süreli sözleşmem bitti', uygun: true },
  { value: 'kapanma', label: 'İşyeri kapandı, el değiştirdi ya da özelleştirildi', uygun: true },
  { value: 'zorlayici', label: 'Zorlayıcı neden (işyerinde 1 haftadan fazla iş durması)', uygun: true },
  { value: 'istifa', label: 'Kendi isteğimle istifa ettim', uygun: false },
  { value: 'ahlak', label: 'Ahlak ve iyiniyet kurallarına aykırılıkla çıkarıldım (25/II)', uygun: false },
];

export default function Calculator() {
  const [tarih, setTarih] = useState('2026-10-29');
  const [giris, setGiris] = useState<Giris>('ortalama');
  const [ortalama, setOrtalama] = useState<number | null>(45000);
  const [aylar, setAylar] = useState<(number | null)[]>([45000, 45000, 45000, 45000]);
  const [primGun, setPrimGun] = useState<number | null>(900);
  const [kesintisiz, setKesintisiz] = useState(true);
  const [neden, setNeden] = useState<Neden>('isveren-fesih');

  useEffect(() => setTarih(todayIsoTR()), []);

  const son4 = giris === 'ortalama' ? [ortalama, ortalama, ortalama, ortalama] : aylar;
  const errors = validateIssizlik({ aylar: son4, primGun, tarih });
  const gecerli = Object.keys(errors).length === 0;
  const nedenUygun = NEDENLER.find((n) => n.value === neden)?.uygun ?? true;

  const r = useMemo(
    () =>
      gecerli
        ? hesaplaIssizlik({ son4Ay: son4 as number[], primGun: primGun!, kesintisiz120: kesintisiz, nedenUygun, tarih })
        : null,
    [gecerli, JSON.stringify(son4), primGun, kesintisiz, nedenUygun, tarih],
  );

  const ozet = r
    ? r.hakVar
      ? [
          `Aylık işsizlik maaşı: ${formatTL(r.aylikNet)} net (${formatTL(r.aylikBrut)} brüt)`,
          `Süre: ${r.sureGun} gün (${r.sureAy} ay) · toplam ${formatTL(r.toplamNet)}`,
        ].join('\n')
      : `İşsizlik ödeneği hakkı yok: ${r.engeller.join(' ')}`
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <DateField id="is-tarih" label="İşten ayrılış tarihi" value={tarih} onChange={setTarih} error={errors.tarih} />
        <SelectField id="is-neden" label="İşten ayrılış nedeni" value={neden} onChange={setNeden} options={NEDENLER} />
        <Segmented
          name="is-giris"
          label="Son 4 ayın brüt kazancı"
          value={giris}
          onChange={setGiris}
          options={[
            { value: 'ortalama', label: 'Hep aynıydı' },
            { value: 'ay', label: 'Ay ay gireceğim' },
          ]}
        />
        {giris === 'ortalama' ? (
          <NumberField id="is-ort" label="Aylık brüt kazanç" value={ortalama} onChange={setOrtalama} suffix="TL" error={errors.aylar} hint="Bordronuzdaki SGK matrahı (prime esas kazanç)." />
        ) : (
          <div class="row-2">
            {aylar.map((a, i) => (
              <NumberField
                key={i}
                id={`is-ay-${i}`}
                label={`${i === 0 ? 'Son ay' : `${i + 1}. önceki ay`}`}
                value={a}
                onChange={(v) => setAylar((l) => l.map((x, j) => (j === i ? v : x)))}
                suffix="TL"
              />
            ))}
            {errors.aylar && <p class="field__error">{errors.aylar}</p>}
          </div>
        )}
        <NumberField
          id="is-prim"
          label="Son 3 yılda ödenen prim günü"
          value={primGun}
          onChange={setPrimGun}
          suffix="gün"
          decimals={0}
          inputMode="numeric"
          error={errors.primGun}
          hint="e-Devlet’te “SGK Tescil ve Hizmet Dökümü”nden bakabilirsiniz."
        />
        <CheckboxField
          id="is-120"
          label="İşten ayrılmadan önceki son 120 gün kesintisiz çalıştım"
          checked={kesintisiz}
          onChange={setKesintisiz}
        />
      </div>

      <div class="calc-results">
        {r ? (
          r.hakVar ? (
            <>
              <ResultHero
                label="Aylık işsizlik maaşınız (net)"
                value={formatTL(r.aylikNet)}
                sub={
                  <>
                    {r.sureAy} ay boyunca · toplam <strong>{formatTL(r.toplamNet)}</strong>
                  </>
                }
              />
              <Breakdown
                rows={[
                  { label: 'Son 4 ay ortalama prime esas kazanç', value: formatTL(r.ortalamaPek) },
                  { label: 'Hesaplanan ödenek (%40)', value: formatTL(r.hesaplananAylik) },
                  ...(r.tavanUygulandi
                    ? [{ label: 'Tavan (brüt asgari ücretin %80’i)', value: formatTL(r.tavan), kind: 'sub' as const }]
                    : []),
                  { label: 'Aylık brüt ödenek', value: formatTL(r.aylikBrut) },
                  { label: 'Damga vergisi (binde 7,59)', value: formatTL(r.aylikDamga), kind: 'minus' },
                  { label: 'Aylık net ödenek', value: formatTL(r.aylikNet), kind: 'total' },
                ]}
              />
              <StatGrid
                items={[
                  { label: 'Ödeme süresi', value: `${r.sureGun} gün` },
                  { label: 'Günlük brüt', value: formatTL(r.gunlukBrut) },
                  { label: 'Prim günü', value: formatNumber(primGun!, 0) },
                ]}
              />
              {r.tavanUygulandi && (
                <Callout kind="info">
                  Kazancınızın %40’ı tavanı aştığı için ödenek, brüt asgari ücretin %80’i olan {formatTL(r.tavan)} ile sınırlandı.
                </Callout>
              )}
              <Callout kind="info">
                İşten ayrıldıktan sonra <strong>30 gün içinde</strong> İŞKUR’a (e-Devlet ya da şube) başvurmalısınız; geç kalınan
                gün kadar ödeme süreniz kısalır.
              </Callout>
              <ShareBar params={{}} summary={ozet} />
            </>
          ) : (
            <>
              <Callout kind="warning">
                <strong>İşsizlik ödeneği hakkınız görünmüyor.</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  {r.engeller.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Callout>
              <p class="field__hint">
                Şartları sağlasaydınız aylık ödeneğiniz yaklaşık {formatTL(r.aylikNet)} net olurdu.
              </p>
            </>
          )
        ) : (
          <ResultEmpty>Sonucu görmek için alanları doldurun.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
