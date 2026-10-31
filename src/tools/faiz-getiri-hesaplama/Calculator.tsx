import { useEffect, useMemo, useState } from 'preact/hooks';
import { tufe } from '../../data/series';
import { todayIsoTR } from '../../lib/finance';
import { formatMonthTR, formatNumber, formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import { aylikHedeftenDonemHedefi, donemHesapla, donemSayisiOf, faizHesapla, gerekenAnapara, reelGetiri, stopajOrani, validateFaiz } from './calc';

type Mod = 'getiri' | 'hedef';
type StopajSecim = 'oto' | 'ozel';

const HIZLI_VADELER = [32, 46, 92, 181, 365];
const sonTufe = tufe.aylar[tufe.aylar.length - 1];

export default function Calculator() {
  const bugun = useMemo(() => todayIsoTR(), []);
  const [mod, setMod] = useState<Mod>('getiri');
  const [anapara, setAnapara] = useState<number | null>(100_000);
  const [oran, setOran] = useState<number | null>(45);
  const [gun, setGun] = useState<number | null>(32);
  const [yenile, setYenile] = useState(false);
  const [toplamGun, setToplamGun] = useState<number | null>(365);
  const [stopajSecim, setStopajSecim] = useState<StopajSecim>('oto');
  const [ozelStopaj, setOzelStopaj] = useState<number | null>(null);
  const [enflasyon, setEnflasyon] = useState<number | null>(sonTufe.yillik);
  const [aylikHedef, setAylikHedef] = useState<number | null>(30_000);

  useEffect(() => {
    const p = readParams();
    const m = enumParam(p, 'mod', ['getiri', 'hedef'] as const);
    if (m) setMod(m);
    const t = numParam(p, 'tutar');
    if (t !== null) setAnapara(t);
    const o = numParam(p, 'oran');
    if (o !== null) setOran(o);
    const g = numParam(p, 'gun');
    if (g !== null) setGun(g);
    const y = boolParam(p, 'yenile');
    if (y !== null) setYenile(y);
    const s = numParam(p, 'sure');
    if (s !== null) setToplamGun(s);
    const st = numParam(p, 'stopaj');
    if (st !== null) {
      setStopajSecim('ozel');
      setOzelStopaj(st);
    }
    const h = numParam(p, 'hedef');
    if (h !== null) setAylikHedef(h);
  }, []);

  const otoStopaj = gun !== null && gun >= 1 ? stopajOrani(gun, bugun) : null;
  const stopaj = stopajSecim === 'oto' ? otoStopaj : ozelStopaj;

  const errors = validateFaiz({
    anapara: mod === 'getiri' ? anapara : 1,
    oran,
    gun,
    toplamGun: mod === 'getiri' && yenile ? toplamGun : undefined,
    stopaj: stopajSecim === 'ozel' ? ozelStopaj : undefined,
  });
  if (stopajSecim === 'ozel' && ozelStopaj === null) errors.stopaj = 'Stopaj oranını girin (yoksa 0 yazın).';
  const hedefHata = mod === 'hedef' && (aylikHedef === null || aylikHedef <= 0) ? 'Ayda ne kadar net faiz istediğinizi yazın.' : null;
  const gecerli = Object.keys(errors).length === 0 && !hedefHata && stopaj !== null;

  const donemSayisi = yenile && toplamGun !== null && gun ? donemSayisiOf(toplamGun, gun) : 1;
  const sonuc = useMemo(
    () => (gecerli && mod === 'getiri' ? faizHesapla({ anapara: anapara!, yillikOran: oran!, gun: gun!, stopaj: stopaj!, donemSayisi }) : null),
    [gecerli, mod, anapara, oran, gun, stopaj, donemSayisi],
  );

  const hedef = useMemo(() => {
    if (!gecerli || mod !== 'hedef') return null;
    const donemHedef = aylikHedeftenDonemHedefi(aylikHedef!, gun!);
    const para = gerekenAnapara(donemHedef, oran!, gun!, stopaj!);
    return { donemHedef, para, kontrol: donemHesapla(para, oran!, gun!, stopaj!) };
  }, [gecerli, mod, aylikHedef, oran, gun, stopaj]);

  const reel = sonuc && enflasyon !== null ? reelGetiri(sonuc.netYillikEfektif, enflasyon) : null;
  const gunlukNet = sonuc ? sonuc.donemler[0].netFaiz / gun! : 0;

  const ozet = sonuc
    ? [
        `${formatTL(anapara!)} · yıllık %${formatNumber(oran!, 2)} · ${gun} gün${donemSayisi > 1 ? ` × ${donemSayisi} vade` : ''}`,
        `Brüt faiz ${formatTL(sonuc.toplamBrut)}, stopaj (%${formatNumber(stopaj!, 2)}) ${formatTL(sonuc.toplamStopaj)}`,
        `Net faiz ${formatTL(sonuc.toplamNet)} · vade sonu ${formatTL(sonuc.sonTutar)}`,
      ].join('\n')
    : hedef
      ? `Ayda ${formatTL(aylikHedef!)} net faiz için yaklaşık ${formatTL(hedef.para, 0)} gerekir (yıllık %${formatNumber(oran!, 2)}, ${gun} gün vade).`
      : '';

  const vadeAlani = (
    <div class="field">
      <NumberField id="fg-gun" label="Vade" value={gun} onChange={setGun} suffix="gün" decimals={0} error={errors.gun} />
      <div class="share-bar" role="group" aria-label="Hızlı vade seçimi">
        {HIZLI_VADELER.map((v) => (
          <button type="button" class={`btn btn--small${gun === v ? ' btn--primary' : ''}`} onClick={() => setGun(v)} key={v}>
            {v} gün
          </button>
        ))}
      </div>
    </div>
  );

  const stopajAlani = (
    <>
      <Segmented
        name="fg-stopaj"
        label="Stopaj (faizden kesilen vergi)"
        value={stopajSecim}
        onChange={setStopajSecim}
        options={[
          { value: 'oto', label: otoStopaj !== null ? `Vadeye göre (%${formatNumber(otoStopaj, 1)})` : 'Vadeye göre' },
          { value: 'ozel', label: 'Kendim gireceğim' },
        ]}
        hint="TL mevduat: vadesiz ve 6 aya kadar %17,5 · 1 yıla kadar %15 · 1 yıldan uzun %10"
      />
      {stopajSecim === 'ozel' && (
        <NumberField id="fg-stopaj-oran" label="Stopaj oranı" value={ozelStopaj} onChange={setOzelStopaj} suffix="%" error={errors.stopaj} hint="Döviz hesabı ya da farklı bir oran için." />
      )}
    </>
  );

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="fg-mod"
          label="Ne hesaplamak istiyorsunuz?"
          value={mod}
          onChange={setMod}
          options={[
            { value: 'getiri', label: 'Faiz getirisi' },
            { value: 'hedef', label: 'Aylık gelir için gereken para' },
          ]}
        />
        {mod === 'getiri' ? (
          <NumberField id="fg-anapara" label="Yatırılacak tutar" value={anapara} onChange={setAnapara} suffix="TL" error={errors.anapara} />
        ) : (
          <NumberField id="fg-hedef" label="Her ay istediğiniz net faiz" value={aylikHedef} onChange={setAylikHedef} suffix="TL" error={hedefHata} />
        )}
        <NumberField id="fg-oran" label="Yıllık brüt faiz oranı" value={oran} onChange={setOran} suffix="%" error={errors.oran} hint="Bankanın ilan ettiği yıllık oran (stopaj öncesi)." />
        {vadeAlani}
        {mod === 'getiri' && (
          <>
            <CheckboxField
              id="fg-yenile"
              label="Vade sonunda faiziyle birlikte yenilensin (bileşik faiz)"
              checked={yenile}
              onChange={setYenile}
              hint="Net faiz anaparaya eklenir, sonraki vade büyümüş tutar üzerinden işler."
            />
            {yenile && (
              <NumberField
                id="fg-sure"
                label="Toplam yatırım süresi"
                value={toplamGun}
                onChange={setToplamGun}
                suffix="gün"
                decimals={0}
                error={errors.toplamGun}
                hint={gun && toplamGun && toplamGun >= gun ? `${donemSayisi} vade üst üste işletilir (${donemSayisi * gun} gün).` : '1 yıl = 365 gün'}
              />
            )}
          </>
        )}
        {stopajAlani}
        {mod === 'getiri' && (
          <Details summary="Enflasyonla karşılaştır">
            <NumberField
              id="fg-enflasyon"
              label="Yıllık enflasyon"
              value={enflasyon}
              onChange={setEnflasyon}
              suffix="%"
              hint={`Varsayılan: ${formatMonthTR(sonTufe.ay)} yıllık TÜFE (%${formatNumber(sonTufe.yillik, 2)}). Kendi beklentinizi de yazabilirsiniz.`}
            />
          </Details>
        )}
      </div>

      <div class="calc-results">
        {sonuc ? (
          <>
            <ResultHero
              label={donemSayisi > 1 ? `${donemSayisi} vade sonunda net faiz` : 'Vade sonunda net faiz'}
              value={formatTL(sonuc.toplamNet)}
              sub={
                <>
                  Toplam tutar <strong>{formatTL(sonuc.sonTutar)}</strong> · {sonuc.toplamGun} gün
                </>
              }
            />
            <Breakdown
              rows={[
                { label: 'Yatırılan tutar', value: formatTL(anapara!) },
                { label: 'Brüt faiz', value: `+${formatTL(sonuc.toplamBrut)}`, kind: 'plus' },
                { label: `Stopaj (%${formatNumber(stopaj!, 2)})`, value: `−${formatTL(sonuc.toplamStopaj)}`, kind: 'minus' },
                { label: 'Net faiz', value: formatTL(sonuc.toplamNet), kind: 'sub' },
                { label: 'Vade sonunda hesapta', value: formatTL(sonuc.sonTutar), kind: 'total' },
              ]}
            />
            <StatGrid
              items={[
                { label: 'Net yıllık getiri', value: formatPercent(sonuc.netYillikBasit) },
                { label: 'Bileşik yıllık getiri', value: formatPercent(sonuc.netYillikEfektif) },
                { label: 'Günlük net faiz', value: formatTL(gunlukNet) },
                { label: 'Aylık ortalama net faiz', value: formatTL((gunlukNet * 365) / 12) },
              ]}
            />
            {reel !== null && (
              <Callout kind={reel >= 0 ? 'success' : 'warning'}>
                Yıllık %{formatNumber(enflasyon!, 2)} enflasyona göre reel getiri <strong>{formatPercent(reel)}</strong>.{' '}
                {reel >= 0 ? 'Paranız enflasyonun üzerinde kazandırıyor.' : 'Bu oranda paranızın alım gücü azalır.'}
              </Callout>
            )}
            {sonuc.donemler.length > 1 && (
              <Details summary="Vade vade birikim tablosu">
                <DataTable
                  scroll
                  columns={[
                    { key: 'd', label: 'Vade' },
                    { key: 'a', label: 'Başta' },
                    { key: 'b', label: 'Brüt faiz' },
                    { key: 's', label: 'Stopaj' },
                    { key: 'n', label: 'Net faiz' },
                    { key: 'e', label: 'Sonda' },
                  ]}
                  rows={sonuc.donemler.map((d) => ({
                    d: `${d.donem}.`,
                    a: formatTL(d.anapara),
                    b: formatTL(d.brutFaiz),
                    s: formatTL(d.stopaj),
                    n: formatTL(d.netFaiz),
                    e: formatTL(d.sonTutar),
                  }))}
                />
              </Details>
            )}
            <Callout kind="info">
              Faiz, bankaların uyguladığı gibi yıl 365 gün sayılarak hesaplanır; brüt faiz ve stopaj kuruşa yuvarlanır. Stopaj, hesabın açıldığı ya da
              yenilendiği gündeki orandır.
            </Callout>
            <ShareBar
              params={{ mod, tutar: anapara, oran, gun, yenile: yenile || null, sure: yenile ? toplamGun : null, stopaj: stopajSecim === 'ozel' ? ozelStopaj : null }}
              summary={ozet}
            />
          </>
        ) : hedef ? (
          <>
            <ResultHero
              label="Yatırmanız gereken tutar"
              value={formatTL(hedef.para, 0)}
              sub={
                <>
                  Her {gun} günlük vadede net <strong>{formatTL(hedef.kontrol.netFaiz)}</strong> ≈ ayda {formatTL(aylikHedef!)}
                </>
              }
            />
            <Breakdown
              title={`Bir vadelik (${gun} gün) faiz`}
              rows={[
                { label: 'Brüt faiz', value: formatTL(hedef.kontrol.brutFaiz) },
                { label: `Stopaj (%${formatNumber(stopaj!, 2)})`, value: `−${formatTL(hedef.kontrol.stopaj)}`, kind: 'minus' },
                { label: 'Net faiz', value: formatTL(hedef.kontrol.netFaiz), kind: 'total' },
              ]}
            />
            <Callout kind="info">
              Faiz oranları her vadede değişebilir; oran düşerse aynı geliri almak için daha fazla para gerekir. Aylık tutar, vade gününe göre ortalamadır.
            </Callout>
            <ShareBar params={{ mod, hedef: aylikHedef, oran, gun, stopaj: stopajSecim === 'ozel' ? ozelStopaj : null }} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için tutarı, yıllık faiz oranını ve vadeyi girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
