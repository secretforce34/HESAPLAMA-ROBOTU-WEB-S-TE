import { useMemo, useRef, useState } from 'preact/hooks';
import { evAlimMasraflari } from '../../data/params/ev-alim';
import { formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, SelectField, TextField } from '../../ui/fields';
import { Breakdown, Callout, Details, ResultEmpty, ResultHero, StackedBar } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { hesaplaEvAlim, validateEvAlim } from './calc';

interface Diger {
  id: number;
  ad: string;
  tutar: number | null;
}

const p = evAlimMasraflari.values;

export default function Calculator() {
  const sayac = useRef(2);
  const [bedel, setBedel] = useState<number | null>(5_000_000);
  const [saticiPayi, setSaticiPayi] = useState(false);
  const [doner, setDoner] = useState<number | null>(p.donerSermayeAralik.min);
  const [emlakciVar, setEmlakciVar] = useState(true);
  const [emlakci, setEmlakci] = useState<number | null>(2);
  const [muteahhit, setMuteahhit] = useState(false);
  const [kdv, setKdv] = useState('1');
  const [krediVar, setKrediVar] = useState(false);
  const [kredi, setKredi] = useState<number | null>(3_000_000);
  const [tahsis, setTahsis] = useState<number | null>(5);
  const [ekspertiz, setEkspertiz] = useState<number | null>(null);
  const [dask, setDask] = useState<number | null>(null);
  const [digerler, setDigerler] = useState<Diger[]>([{ id: 1, ad: 'Nakliye', tutar: null }]);

  const errors = validateEvAlim({ bedel, emlakci: emlakciVar ? emlakci : 0, kredi: krediVar ? kredi : 0 });
  const gecerli = Object.keys(errors).length === 0;
  const r = useMemo(
    () =>
      gecerli
        ? hesaplaEvAlim({
            satisBedeli: bedel!,
            saticiHarciniDaOde: saticiPayi,
            donerSermaye: doner ?? 0,
            emlakciYuzde: emlakciVar ? (emlakci ?? 0) : 0,
            kdvYuzde: muteahhit ? Number(kdv) : 0,
            krediTutari: krediVar ? (kredi ?? 0) : 0,
            tahsisBinde: tahsis ?? 0,
            ekspertiz: ekspertiz ?? 0,
            dask: dask ?? 0,
            digerler: digerler.map((d) => ({ ad: d.ad, tutar: d.tutar ?? 0 })),
          })
        : null,
    [gecerli, bedel, saticiPayi, doner, emlakciVar, emlakci, muteahhit, kdv, krediVar, kredi, tahsis, ekspertiz, dask, digerler],
  );

  const ozet = r
    ? [`Satış bedeli: ${formatTL(bedel!, 0)}`, ...r.kalemler.map((k) => `${k.ad}: ${formatTL(k.tutar, 0)}`), `Toplam masraf: ${formatTL(r.toplamMasraf, 0)}`].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <NumberField
          id="ea-bedel"
          label="Satış bedeli (tapuda beyan edilecek)"
          value={bedel}
          onChange={setBedel}
          suffix="TL"
          error={errors.bedel}
          hint="Tapu harcı bu tutar üzerinden alınır; emlak vergisi değerinin altında olamaz."
        />
        <CheckboxField
          id="ea-satici"
          label="Satıcının tapu harcı payını da ben ödeyeceğim"
          checked={saticiPayi}
          onChange={setSaticiPayi}
          hint="Kanunen her taraf %2 öder; uygulamada pazarlıkla alıcı tamamını üstlenebilir."
        />
        <NumberField
          id="ea-doner"
          label="Tapu döner sermaye ücreti"
          value={doner}
          onChange={setDoner}
          suffix="TL"
          hint={`2026’da bölgeye göre yaklaşık ${formatTL(p.donerSermayeAralik.min, 0)} – ${formatTL(p.donerSermayeAralik.max, 0)}.`}
        />
        <CheckboxField id="ea-emlakci-var" label="Emlakçı aracılığıyla alıyorum" checked={emlakciVar} onChange={setEmlakciVar} />
        {emlakciVar && (
          <NumberField
            id="ea-emlakci"
            label="Sizin ödeyeceğiniz hizmet bedeli"
            value={emlakci}
            onChange={setEmlakci}
            suffix="%"
            error={errors.emlakci}
            hint={`KDV hariç. Toplam bedel %${p.emlakciToplamUstSinir}’ü geçemez; aksi kararlaştırılmadıkça alıcı ve satıcı eşit (%2’şer) öder. Üzerine %${p.emlakciKdv} KDV eklenir.`}
          />
        )}
        <CheckboxField id="ea-muteahhit" label="Müteahhitten yeni konut alıyorum (fiyata KDV eklenecek)" checked={muteahhit} onChange={setMuteahhit} />
        {muteahhit && (
          <SelectField
            id="ea-kdv"
            label="Konutun KDV oranı"
            value={kdv}
            onChange={setKdv}
            options={[
              { value: '1', label: '%1' },
              { value: '10', label: '%10' },
              { value: '20', label: '%20' },
            ]}
            hint="Oran, konutun net alanına, arsa değerine ve ruhsat tarihine göre değişir; satış sözleşmesindeki oranı seçin."
          />
        )}
        <CheckboxField id="ea-kredi-var" label="Konut kredisi kullanacağım" checked={krediVar} onChange={setKrediVar} />
        {krediVar && (
          <>
            <NumberField id="ea-kredi" label="Kredi tutarı" value={kredi} onChange={setKredi} suffix="TL" error={errors.kredi} />
            <div class="row-2">
              <NumberField id="ea-tahsis" label="Tahsis ücreti" value={tahsis} onChange={setTahsis} suffix="‰" hint="En fazla binde 5." />
              <NumberField id="ea-ekspertiz" label="Ekspertiz ücreti" value={ekspertiz} onChange={setEkspertiz} suffix="TL" />
            </div>
          </>
        )}
        <Details summary="Diğer masraflar (DASK, nakliye, tadilat…)">
          <div class="calc-inputs">
            <NumberField id="ea-dask" label="DASK (zorunlu deprem sigortası) yıllık prim" value={dask} onChange={setDask} suffix="TL" hint="Tapu işleminde güncel DASK poliçesi istenir." />
            <ul class="line-items">
              {digerler.map((d, i) => (
                <li class="line-item" key={d.id}>
                  <div class="line-item__head">
                    <span>Masraf {i + 1}</span>
                    <button
                      type="button"
                      class="line-item__remove"
                      aria-label={`Masraf ${i + 1}’i sil`}
                      onClick={() => setDigerler((l) => l.filter((x) => x.id !== d.id))}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div class="line-item__fields">
                    <TextField id={`ea-dad-${d.id}`} label="Masraf" value={d.ad} onChange={(v) => setDigerler((l) => l.map((x) => (x.id === d.id ? { ...x, ad: v } : x)))} />
                    <NumberField
                      id={`ea-dtut-${d.id}`}
                      label="Tutar"
                      value={d.tutar}
                      suffix="TL"
                      onChange={(v) => setDigerler((l) => l.map((x) => (x.id === d.id ? { ...x, tutar: v } : x)))}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" class="btn btn--small add-row" onClick={() => setDigerler((l) => [...l, { id: sayac.current++, ad: '', tutar: null }])}>
              + Masraf ekle
            </button>
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {r ? (
          <>
            <ResultHero
              label="Fiyatın üzerine eklenecek masraflar"
              value={formatTL(r.toplamMasraf, 0)}
              sub={
                <>
                  Satış bedelinin {formatPercent(r.masrafOrani, 2)}’i · evin toplam maliyeti <strong>{formatTL(r.toplamMaliyet, 0)}</strong>
                </>
              }
            />
            <Breakdown
              rows={[
                ...r.kalemler.map((k) => ({ label: k.ad, value: formatTL(k.tutar), hint: k.aciklama })),
                { label: 'Toplam masraf', value: formatTL(r.toplamMasraf), kind: 'total' as const },
              ]}
            />
            <StackedBar
              label="Masrafların dağılımı"
              parts={r.kalemler.filter((k) => !k.ad.startsWith('KDV')).map((k) => ({ label: k.ad.replace(/ \(.*\)$/, ''), value: k.tutar }))}
            />
            {krediVar && (
              <Callout kind="info">
                Kredi sonrası peşin hazırlamanız gereken tutar: <strong>{formatTL(r.pesinGereken, 0)}</strong> (fiyat, KDV ve masraflar dahil).
              </Callout>
            )}
            <Callout kind="info">
              Tapuda gerçek satış bedelinin altında değer beyan etmek vergi ziyaı cezasına yol açabilir. Harcı ödemeden önce tapu
              müdürlüğünün hesapladığı tutarı kontrol edin.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için satış bedelini girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
