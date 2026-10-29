import { useMemo, useState } from 'preact/hooks';
import { krediVergileri, type KrediTuru } from '../../data/params/kredi';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { erkenKapama, kismiOdeme, validateErken, varsayilanVergiler, type FaizTipi, type KismiSecim } from './calc';

type Islem = 'tam' | 'kismi';
const TURLER = (Object.keys(krediVergileri.values.turler) as KrediTuru[]).map((t) => ({ value: t, label: krediVergileri.values.turler[t].ad }));

export default function Calculator() {
  const [tur, setTur] = useState<KrediTuru>('ihtiyac');
  const [anapara, setAnapara] = useState<number | null>(200000);
  const [vade, setVade] = useState<number | null>(36);
  const [faiz, setFaiz] = useState<number | null>(3.5);
  const [odenen, setOdenen] = useState<number | null>(12);
  const [gun, setGun] = useState<number | null>(0);
  const [kkdf, setKkdf] = useState<number | null>(15);
  const [bsmv, setBsmv] = useState<number | null>(15);
  const [faizTipi, setFaizTipi] = useState<FaizTipi>('sabit');
  const [ticariOran, setTicariOran] = useState<number | null>(0);
  const [islem, setIslem] = useState<Islem>('tam');
  const [araTutar, setAraTutar] = useState<number | null>(50000);
  const [secim, setSecim] = useState<KismiSecim>('taksit');

  const turDegis = (t: KrediTuru) => {
    setTur(t);
    const v = varsayilanVergiler(t);
    setKkdf(v.kkdf);
    setBsmv(v.bsmv);
  };

  const errors = validateErken({ anapara, vade, faiz, odenen, gun });
  const gecerli = Object.keys(errors).length === 0 && kkdf !== null && bsmv !== null;
  const girdi = gecerli
    ? { tur, anapara: anapara!, vade: vade!, aylikFaiz: faiz!, kkdf: kkdf!, bsmv: bsmv!, odenenTaksit: odenen!, gecenGun: gun!, faizTipi, ticariOran: ticariOran ?? 0 }
    : null;

  const k = useMemo(() => (girdi ? erkenKapama(girdi) : null), [JSON.stringify(girdi)]);
  const kismi = useMemo(
    () => (girdi && islem === 'kismi' && araTutar ? kismiOdeme(girdi, araTutar, secim) : null),
    [JSON.stringify(girdi), islem, araTutar, secim],
  );

  const ozet = k
    ? islem === 'tam'
      ? [`Kalan anapara: ${formatTL(k.kalanAnapara)}`, `Kapama tutarı: ${formatTL(k.kapamaTutari)}`, `Tasarruf: ${formatTL(k.tasarruf)}`].join('\n')
      : kismi
        ? [`Ara ödeme: ${formatTL(araTutar!)}`, `Yeni taksit: ${formatTL(kismi.yeniTaksit)} × ${kismi.yeniVade} ay`, `Tasarruf: ${formatTL(kismi.tasarruf)}`].join('\n')
        : ''
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <SelectField id="ek-tur" label="Kredi türü" value={tur} onChange={turDegis} options={TURLER} />
        {tur === 'konut' && (
          <Segmented
            name="ek-faiztipi"
            label="Faiz türü"
            value={faizTipi}
            onChange={setFaizTipi}
            options={[
              { value: 'sabit', label: 'Sabit faizli' },
              { value: 'degisken', label: 'Değişken faizli' },
            ]}
          />
        )}
        <div class="row-2">
          <NumberField id="ek-anapara" label="Çekilen kredi" value={anapara} onChange={setAnapara} suffix="TL" error={errors.anapara} />
          <NumberField id="ek-vade" label="Vade" value={vade} onChange={setVade} suffix="ay" decimals={0} error={errors.vade} />
        </div>
        <div class="row-2">
          <NumberField id="ek-faiz" label="Aylık faiz" value={faiz} onChange={setFaiz} suffix="%" decimals={4} error={errors.faiz} />
          <NumberField
            id="ek-odenen"
            label="Ödenen taksit"
            value={odenen}
            onChange={setOdenen}
            suffix="adet"
            decimals={0}
            error={errors.odenen}
          />
        </div>
        <Segmented
          name="ek-islem"
          label="Ne yapmak istiyorsunuz?"
          value={islem}
          onChange={setIslem}
          options={[
            { value: 'tam', label: 'Tamamen kapatmak' },
            { value: 'kismi', label: 'Ara ödeme yapmak' },
          ]}
        />
        {islem === 'kismi' && (
          <>
            <NumberField id="ek-ara" label="Ara ödeme tutarı" value={araTutar} onChange={setAraTutar} suffix="TL" />
            <Segmented
              name="ek-secim"
              label="Ara ödemeden sonra"
              value={secim}
              onChange={setSecim}
              options={[
                { value: 'taksit', label: 'Taksitim düşsün' },
                { value: 'vade', label: 'Vadem kısalsın' },
              ]}
            />
          </>
        )}
        <Details summary="Gelişmiş: vergiler, işlemiş faiz, sözleşme ücreti">
          <div class="calc-inputs">
            <div class="row-2">
              <NumberField id="ek-kkdf" label="KKDF" value={kkdf} onChange={setKkdf} suffix="%" />
              <NumberField id="ek-bsmv" label="BSMV" value={bsmv} onChange={setBsmv} suffix="%" />
            </div>
            <NumberField
              id="ek-gun"
              label="Son taksitten bu yana geçen gün"
              value={gun}
              onChange={setGun}
              suffix="gün"
              decimals={0}
              error={errors.gun}
              hint="Kapatma taksit gününde değilse aradaki günlerin faizi de ödenir."
            />
            {tur === 'ticari' && (
              <NumberField id="ek-ticari" label="Sözleşmedeki erken ödeme ücreti" value={ticariOran} onChange={setTicariOran} suffix="%" />
            )}
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {k ? (
          islem === 'tam' ? (
            <>
              <ResultHero
                label="Krediyi kapatmak için ödemeniz gereken"
                value={formatTL(k.kapamaTutari)}
                sub={
                  <>
                    Kalan {k.kalanTaksitSayisi} taksit yerine · <strong>{formatTL(k.tasarruf)}</strong> tasarruf
                  </>
                }
              />
              <Breakdown
                rows={[
                  { label: 'Kalan anapara', value: formatTL(k.kalanAnapara) },
                  ...(k.islemisFaiz > 0 ? [{ label: 'İşlemiş faiz ve vergisi', value: formatTL(k.islemisFaiz), kind: 'plus' as const }] : []),
                  ...(k.tazminat > 0
                    ? [{ label: `Erken ödeme tazminatı (%${formatNumber(k.tazminatOrani, 2)})`, value: formatTL(k.tazminat), kind: 'plus' as const }]
                    : []),
                  { label: 'Kapama tutarı', value: formatTL(k.kapamaTutari), kind: 'total' },
                ]}
              />
              <StatGrid
                items={[
                  { label: 'Devam etseydi ödenecek', value: formatTL(k.kalanOdemeler, 0) },
                  { label: 'Tasarruf', value: formatTL(k.tasarruf, 0) },
                  { label: 'Aylık taksit', value: formatTL(k.plan.taksit, 0) },
                ]}
              />
              <Callout kind="info">{k.tazminatAciklama}</Callout>
            </>
          ) : kismi ? (
            <>
              <ResultHero
                label={secim === 'taksit' ? 'Yeni aylık taksitiniz' : 'Yeni kalan vadeniz'}
                value={secim === 'taksit' ? formatTL(kismi.yeniTaksit) : `${kismi.yeniVade} ay`}
                sub={
                  <>
                    {secim === 'taksit' ? `Eski taksit ${formatTL(k.plan.taksit)}` : `Eski kalan vade ${k.kalanTaksitSayisi} ay`} · tasarruf{' '}
                    <strong>{formatTL(kismi.tasarruf)}</strong>
                  </>
                }
              />
              <Breakdown
                rows={[
                  { label: 'Kalan anapara', value: formatTL(k.kalanAnapara) },
                  { label: 'Ara ödeme (anaparadan düşer)', value: formatTL(kismi.dusenAnapara), kind: 'minus' },
                  ...(kismi.tazminat > 0 ? [{ label: `Erken ödeme tazminatı (%${formatNumber(k.tazminatOrani, 2)})`, value: formatTL(kismi.tazminat) }] : []),
                  { label: 'Yeni anapara', value: formatTL(k.kalanAnapara - kismi.dusenAnapara), kind: 'total' },
                  { label: 'Yeni plan', value: `${formatTL(kismi.yeniTaksit)} × ${kismi.yeniVade} ay` },
                ]}
              />
              <Callout kind="info">
                Aynı tutarla vadeyi kısaltmak genellikle daha fazla faiz tasarrufu sağlar; taksiti düşürmek ise aylık bütçenizi
                rahatlatır. Bankanız ara ödemeden sonra yeni ödeme planı vermekle yükümlüdür.
              </Callout>
            </>
          ) : (
            <ResultEmpty>Ara ödeme tutarı, kalan anaparadan ({formatTL(k.kalanAnapara)}) az olmalı.</ResultEmpty>
          )
        ) : (
          <ResultEmpty>Sonucu görmek için kredi bilgilerinizi girin.</ResultEmpty>
        )}
        {k && <ShareBar params={{}} summary={ozet} />}
        {k && (
          <p class="field__hint">
            Faiz: aylık {formatPercent(faiz!, 2)}; KKDF {formatPercent(kkdf!, 0)}, BSMV {formatPercent(bsmv!, 0)}. Kesin tutar için bankanızdan
            “erken kapama tutarı” isteyin.
          </p>
        )}
      </div>
    </div>
  );
}
