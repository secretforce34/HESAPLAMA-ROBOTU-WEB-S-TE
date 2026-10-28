import { useEffect, useMemo, useState } from 'preact/hooks';
import { kdvOranlari } from '../../data/params/kdv';
import { formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import { hesaplaKdv, validateKdv, type KdvMode } from './calc';

type RateChoice = '1' | '10' | '20' | 'diger';
const RATE_CHOICES: RateChoice[] = ['1', '10', '20', 'diger'];
const TEVKIFAT = kdvOranlari.values.tevkifatPaylari;

export default function Calculator() {
  const [amount, setAmount] = useState<number | null>(1000);
  const [mode, setMode] = useState<KdvMode>('haric');
  const [rateChoice, setRateChoice] = useState<RateChoice>('20');
  const [customRate, setCustomRate] = useState<number | null>(18);
  const [tevkifatOn, setTevkifatOn] = useState(false);
  const [tevkifat, setTevkifat] = useState(9);

  // Paylaşılan bağlantıdan gelen değerler (yalnızca ilk açılışta).
  useEffect(() => {
    const p = readParams();
    const a = numParam(p, 'tutar');
    if (a !== null) setAmount(a);
    const m = enumParam(p, 'tur', ['haric', 'dahil'] as const);
    if (m) setMode(m);
    const o = numParam(p, 'oran');
    if (o !== null) {
      const asChoice = String(o) as RateChoice;
      if (RATE_CHOICES.includes(asChoice) && asChoice !== 'diger') setRateChoice(asChoice);
      else {
        setRateChoice('diger');
        setCustomRate(o);
      }
    }
    const t = numParam(p, 'tevkifat');
    if (t !== null && TEVKIFAT.includes(t)) {
      setTevkifatOn(true);
      setTevkifat(t);
    } else if (boolParam(p, 'tevkifat') === false) setTevkifatOn(false);
  }, []);

  const rate = rateChoice === 'diger' ? customRate : Number(rateChoice);
  const errors = validateKdv({ amount: amount ?? undefined, rate: rate ?? undefined });
  const valid = Object.keys(errors).length === 0 && amount !== null && rate !== null;

  const result = useMemo(
    () => (valid ? hesaplaKdv({ amount: amount!, rate: rate!, mode, tevkifat: tevkifatOn ? tevkifat : 0 }) : null),
    [valid, amount, rate, mode, tevkifatOn, tevkifat],
  );

  const summary = result
    ? [
        `KDV hariç tutar: ${formatTL(result.matrah)}`,
        `KDV (${formatPercent(rate!)}): ${formatTL(result.kdv)}`,
        `KDV dahil toplam: ${formatTL(result.toplam)}`,
        ...(tevkifatOn
          ? [`Tevkifat (${tevkifat}/10): ${formatTL(result.tevkifEdilen)}`, `Alıcının ödeyeceği: ${formatTL(result.odenecekToplam)}`]
          : []),
        `Hesaplayan: ${typeof window !== 'undefined' ? window.location.origin : ''}`,
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <NumberField
          id="kdv-tutar"
          label="Tutar"
          value={amount}
          onChange={setAmount}
          suffix="TL"
          placeholder="ör. 1.000"
          error={errors.amount}
        />
        <Segmented
          name="kdv-tur"
          label="Girdiğim tutar"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'haric', label: 'KDV hariç' },
            { value: 'dahil', label: 'KDV dahil' },
          ]}
        />
        <Segmented
          name="kdv-oran"
          label="KDV oranı"
          value={rateChoice}
          onChange={setRateChoice}
          options={[
            { value: '1', label: '%1' },
            { value: '10', label: '%10' },
            { value: '20', label: '%20' },
            { value: 'diger', label: 'Diğer' },
          ]}
          hint="Genel oran %20’dir. Bazı temel gıdalar %1, bazı mal ve hizmetler %10 orana tabidir."
        />
        {rateChoice === 'diger' && (
          <NumberField
            id="kdv-ozel-oran"
            label="Özel KDV oranı"
            value={customRate}
            onChange={setCustomRate}
            suffix="%"
            error={errors.rate}
            hint="Eski tarihli faturalar için %8 veya %18 gibi oranları da yazabilirsiniz."
          />
        )}
        <CheckboxField
          id="kdv-tevkifat"
          label="Tevkifatlı fatura"
          checked={tevkifatOn}
          onChange={setTevkifatOn}
          hint="Alıcı, KDV’nin bir kısmını satıcıya ödemeyip kendisi vergi dairesine yatırır."
        />
        {tevkifatOn && (
          <SelectField
            id="kdv-tevkifat-orani"
            label="Tevkifat oranı"
            value={String(tevkifat)}
            onChange={(v) => setTevkifat(Number(v))}
            options={TEVKIFAT.map((t) => ({ value: String(t), label: t === 10 ? '10/10 (tam tevkifat)' : `${t}/10` }))}
            hint="Hangi işte hangi oranın uygulanacağı KDV Genel Uygulama Tebliği’nde belirlenir; faturanızdaki oranı seçin."
          />
        )}
      </div>

      <div class="calc-results">
        {result ? (
          <>
            {mode === 'haric' ? (
              <ResultHero
                label="KDV dahil toplam"
                value={formatTL(result.toplam)}
                sub={
                  <>
                    {formatTL(result.matrah)} + <strong>{formatTL(result.kdv)}</strong> KDV ({formatPercent(rate!)})
                  </>
                }
              />
            ) : (
              <ResultHero
                label="KDV hariç tutar"
                value={formatTL(result.matrah)}
                sub={
                  <>
                    {formatTL(result.toplam)} içindeki KDV: <strong>{formatTL(result.kdv)}</strong> ({formatPercent(rate!)})
                  </>
                }
              />
            )}
            <Breakdown
              rows={[
                { label: 'KDV hariç tutar (matrah)', value: formatTL(result.matrah) },
                { label: `KDV (${formatPercent(rate!)})`, value: formatTL(result.kdv), kind: 'plus' },
                { label: 'KDV dahil toplam', value: formatTL(result.toplam), kind: 'total' },
              ]}
            />
            {tevkifatOn && (
              <Breakdown
                title={`Tevkifatlı fatura (${tevkifat}/10)`}
                rows={[
                  {
                    label: 'Alıcının keseceği KDV',
                    value: formatTL(result.tevkifEdilen),
                    kind: 'minus',
                    hint: 'Alıcı bu tutarı KDV-2 beyannamesiyle kendisi öder.',
                  },
                  { label: 'Satıcının tahsil edeceği KDV', value: formatTL(result.tahsilEdilecekKdv) },
                  { label: 'Alıcının satıcıya ödeyeceği', value: formatTL(result.odenecekToplam), kind: 'total' },
                ]}
              />
            )}
            {mode === 'dahil' && rate === 20 && (
              <Callout kind="info">
                Sık yapılan hata: {formatTL(result.toplam)} tutarının %20’si ({formatTL(result.toplam * 0.2)}) KDV
                değildir. Doğrusu tutarı 1,20’ye bölmektir.
              </Callout>
            )}
            <ShareBar
              params={{ tutar: amount, tur: mode, oran: rate, tevkifat: tevkifatOn ? tevkifat : null }}
              summary={summary}
            />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için geçerli bir tutar ve oran girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
