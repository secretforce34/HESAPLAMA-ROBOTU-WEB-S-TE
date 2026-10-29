import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, Segmented } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { enumParam, numParam, readParams } from '../../ui/url';
import { benimLotum, esitDagitim, oransalDagitim, senaryolar, validateHalkaArz, type TalepGrubu } from './calc';

type Yontem = 'esit' | 'oransal';
type TalepBirimi = 'lot' | 'tl';

interface Grup {
  id: number;
  kisi: number | null;
  talep: number | null;
}

const COK_BUYUK = Number.MAX_SAFE_INTEGER;
const lotAraligi = (a: number, b: number) => (a === b ? `${formatNumber(a, 0)} lot` : `${formatNumber(a, 0)}–${formatNumber(b, 0)} lot`);
const tlAraligi = (a: number, b: number) => (a === b ? formatTL(a) : `${formatTL(a)} – ${formatTL(b)}`);

export default function Calculator() {
  const sayac = useRef(1);
  const [yontem, setYontem] = useState<Yontem>('esit');
  const [lot, setLot] = useState<number | null>(10_000_000);
  const [fiyat, setFiyat] = useState<number | null>(25);
  const [katilimci, setKatilimci] = useState<number | null>(500_000);
  const [birim, setBirim] = useState<TalepBirimi>('lot');
  const [talepLot, setTalepLot] = useState<number | null>(1000);
  const [talepTl, setTalepTl] = useState<number | null>(25_000);
  const [toplamTalep, setToplamTalep] = useState<number | null>(40_000_000);
  const [gruplar, setGruplar] = useState<Grup[]>([]);

  useEffect(() => {
    const p = readParams();
    const y = enumParam(p, 'yontem', ['esit', 'oransal'] as const);
    if (y) setYontem(y);
    const l = numParam(p, 'lot');
    if (l !== null) setLot(l);
    const f = numParam(p, 'fiyat');
    if (f !== null) setFiyat(f);
    const k = numParam(p, 'kisi');
    if (k !== null) setKatilimci(k);
    const t = numParam(p, 'talep');
    if (t !== null) {
      setBirim('lot');
      setTalepLot(t);
    }
    const tt = numParam(p, 'toplam');
    if (tt !== null) setToplamTalep(tt);
  }, []);

  const talep = birim === 'lot' ? talepLot : talepTl !== null && fiyat ? Math.floor(talepTl / fiyat) : null;
  const errors = validateHalkaArz({ lot, fiyat, katilimci, talep });
  if (birim === 'tl' && errors.talep && talepTl !== null && fiyat) errors.talep = 'Bu tutar en az 1 lota yetmiyor.';

  const grupKisi = gruplar.reduce((t, g) => t + (g.kisi ?? 0), 0);
  const grupHatasi =
    katilimci !== null && grupKisi > katilimci - 1 ? 'Gruplardaki kişi sayısı toplam katılımcıdan (siz hariç) fazla olamaz.' : null;
  if (yontem === 'oransal' && (toplamTalep === null || toplamTalep <= 0)) errors.toplam = 'Toplam talep edilen lotu girin.';

  const gecerli = Object.keys(errors).length === 0 && !grupHatasi;

  const sonuc = useMemo(() => {
    if (!gecerli) return null;
    if (yontem === 'oransal') {
      const o = oransalDagitim(lot!, toplamTalep!, talep!);
      return { tur: 'oransal' as const, o };
    }
    const tanimli: TalepGrubu[] = gruplar
      .filter((g) => (g.kisi ?? 0) > 0 && (g.talep ?? 0) > 0)
      .map((g) => ({ kisi: g.kisi!, talep: g.talep! }));
    const kalan = katilimci! - 1 - tanimli.reduce((t, g) => t + g.kisi, 0);
    const tumu: TalepGrubu[] = [...tanimli, { kisi: kalan, talep: COK_BUYUK }, { kisi: 1, talep: talep! }];
    const s = esitDagitim(lot!, tumu);
    const b = benimLotum(s, talep!);
    const katsayilar = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const sen = senaryolar(
      lot!,
      katsayilar.map((c) => Math.max(1, Math.round(katilimci! * c))),
      talep!,
    );
    return { tur: 'esit' as const, s, b, sen };
  }, [gecerli, yontem, lot, toplamTalep, talep, gruplar, katilimci]);

  const enAz = sonuc ? (sonuc.tur === 'esit' ? sonuc.b.enAz : sonuc.o.enAz) : 0;
  const enCok = sonuc ? (sonuc.tur === 'esit' ? sonuc.b.enCok : sonuc.o.enCok) : 0;

  const ozet = sonuc
    ? [
        `Halka arz: ${formatNumber(lot!, 0)} lot (bireysel), fiyat ${formatTL(fiyat!)}`,
        sonuc.tur === 'esit' ? `Tahmini katılımcı: ${formatNumber(katilimci!, 0)}` : `Toplam talep: ${formatNumber(toplamTalep!, 0)} lot`,
        `Talebim: ${formatNumber(talep!, 0)} lot`,
        `Tahmini alacağım: ${lotAraligi(enAz, enCok)} (${tlAraligi(enAz * fiyat!, enCok * fiyat!)})`,
        'Tahmindir; kesin sonuç KAP’taki dağıtım sonuçlarıdır.',
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="ha-yontem"
          label="Dağıtım yöntemi"
          value={yontem}
          onChange={setYontem}
          options={[
            { value: 'esit', label: 'Eşit dağıtım' },
            { value: 'oransal', label: 'Oransal dağıtım' },
          ]}
          hint="İlk halka arzlarda bireysel yatırımcılara SPK kararıyla eşit dağıtım uygulanır. Yöntem izahnamede yazar."
        />
        <NumberField
          id="ha-lot"
          label="Bireysel yatırımcılara ayrılan lot"
          value={lot}
          onChange={setLot}
          suffix="lot"
          decimals={0}
          inputMode="numeric"
          error={errors.lot}
          hint="İzahnamenin “tahsisat” bölümünde yurt içi bireysel yatırımcılara ayrılan pay miktarı (1 lot = 1 pay)."
        />
        <NumberField id="ha-fiyat" label="Halka arz fiyatı" value={fiyat} onChange={setFiyat} suffix="TL" error={errors.fiyat} />
        {yontem === 'esit' ? (
          <NumberField
            id="ha-kisi"
            label="Tahmini katılımcı sayısı"
            value={katilimci}
            onChange={setKatilimci}
            suffix="kişi"
            decimals={0}
            inputMode="numeric"
            error={errors.katilimci}
            hint="Benzer büyüklükteki son halka arzlarda KAP’ta açıklanan bireysel katılımcı sayılarına bakabilirsiniz."
          />
        ) : (
          <NumberField
            id="ha-toplam"
            label="Bireysel gruptaki toplam talep"
            value={toplamTalep}
            onChange={setToplamTalep}
            suffix="lot"
            decimals={0}
            inputMode="numeric"
            error={errors.toplam}
          />
        )}
        <Segmented
          name="ha-birim"
          label="Talebimi şöyle gireceğim"
          value={birim}
          onChange={setBirim}
          options={[
            { value: 'lot', label: 'Lot olarak' },
            { value: 'tl', label: 'Tutar (TL) olarak' },
          ]}
        />
        {birim === 'lot' ? (
          <NumberField
            id="ha-talep"
            label="Talep ettiğim lot"
            value={talepLot}
            onChange={setTalepLot}
            suffix="lot"
            decimals={0}
            inputMode="numeric"
            error={errors.talep}
          />
        ) : (
          <NumberField
            id="ha-talep-tl"
            label="Talep ettiğim tutar"
            value={talepTl}
            onChange={setTalepTl}
            suffix="TL"
            error={errors.talep}
            hint={talep && fiyat ? `= ${formatNumber(talep, 0)} lot` : undefined}
          />
        )}

        {yontem === 'esit' && (
          <Details summary="Gelişmiş: katılımcıların talep dağılımı">
            <p class="field__hint" style={{ marginTop: 0 }}>
              Eşit paydan daha az lot isteyen katılımcılar varsa, onlardan artan paylar diğerlerine dağıtılır ve sizin payınız
              büyür. Bilinen ya da tahmin ettiğiniz grupları ekleyin; listede olmayan katılımcıların eşit paydan fazla talep ettiği
              varsayılır.
            </p>
            <ul class="line-items">
              {gruplar.map((g, i) => (
                <li class="line-item" key={g.id}>
                  <div class="line-item__head">
                    <span>Grup {i + 1}</span>
                    <button
                      type="button"
                      class="line-item__remove"
                      aria-label={`Grup ${i + 1}’i sil`}
                      onClick={() => setGruplar((l) => l.filter((x) => x.id !== g.id))}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div class="row-2">
                    <NumberField
                      id={`ha-g-kisi-${g.id}`}
                      label="Kişi sayısı"
                      value={g.kisi}
                      decimals={0}
                      inputMode="numeric"
                      onChange={(v) => setGruplar((l) => l.map((x) => (x.id === g.id ? { ...x, kisi: v } : x)))}
                    />
                    <NumberField
                      id={`ha-g-talep-${g.id}`}
                      label="Kişi başı talep"
                      value={g.talep}
                      suffix="lot"
                      decimals={0}
                      inputMode="numeric"
                      onChange={(v) => setGruplar((l) => l.map((x) => (x.id === g.id ? { ...x, talep: v } : x)))}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {grupHatasi && <p class="field__error">{grupHatasi}</p>}
            <button
              type="button"
              class="btn btn--small add-row"
              style={{ marginTop: '10px' }}
              onClick={() => setGruplar((l) => [...l, { id: sayac.current++, kisi: null, talep: null }])}
            >
              + Grup ekle
            </button>
          </Details>
        )}
      </div>

      <div class="calc-results">
        {sonuc ? (
          <>
            <ResultHero
              label="Tahmini alacağınız"
              value={lotAraligi(enAz, enCok)}
              sub={<>≈ {tlAraligi(enAz * fiyat!, enCok * fiyat!)}</>}
            />
            {sonuc.tur === 'esit' ? (
              <>
                <Breakdown
                  rows={[
                    {
                      label: 'Kişi başı eşit pay',
                      value: sonuc.s.esitPay === null ? 'Tüm talepler karşılanıyor' : `${formatNumber(sonuc.s.esitPay, 2)} lot`,
                      hint: 'Talebi tamamen karşılanamayan katılımcılara düşen pay',
                    },
                    { label: 'Talebiniz', value: `${formatNumber(talep!, 0)} lot`, hint: `Bloke: ${formatTL(talep! * fiyat!)}` },
                    { label: 'Tahmini alacağınız', value: lotAraligi(enAz, enCok), kind: 'total' },
                    {
                      label: 'İade edilecek bloke',
                      value: tlAraligi((talep! - enCok) * fiyat!, (talep! - enAz) * fiyat!),
                      kind: 'plus',
                    },
                  ]}
                />
                {sonuc.b.tamKarsilandi ? (
                  <Callout kind="success">Talebiniz eşit payın altında kaldığı için tamamen karşılanır.</Callout>
                ) : (
                  sonuc.s.fazlaAlanSayisi > 0 && (
                    <Callout kind="info">
                      Küsurat kuralı: talebi tamamen karşılanamayan {formatNumber(sonuc.s.karsilanamayanSayisi, 0)} kişiden{' '}
                      {formatNumber(sonuc.s.fazlaAlanSayisi, 0)} kişiye 1’er lot fazla verilir (yaklaşık{' '}
                      {formatPercent((sonuc.s.fazlaAlanSayisi / sonuc.s.karsilanamayanSayisi) * 100, 0)} ihtimal). Kimlere verileceğini
                      ihraççı belirler.
                    </Callout>
                  )
                )}
                {sonuc.s.taban === 0 && (
                  <Callout kind="warning">
                    Ayrılan lot katılımcı sayısından az: katılımcıların bir kısmı hiç pay alamayabilir.
                  </Callout>
                )}
                <DataTable
                  caption="Katılımcı sayısına göre senaryolar (herkes eşit paydan fazla isterse)"
                  columns={[
                    { key: 'k', label: 'Katılımcı' },
                    { key: 'l', label: 'Kişi başı lot' },
                    { key: 't', label: 'Tutar' },
                  ]}
                  rows={sonuc.sen.map((s) => ({
                    k: formatNumber(s.katilimci, 0),
                    l: lotAraligi(s.enAz, s.enCok),
                    t: tlAraligi(s.enAz * fiyat!, s.enCok * fiyat!),
                  }))}
                />
              </>
            ) : (
              <Breakdown
                rows={[
                  { label: 'Arzın talebi karşılama oranı', value: formatPercent(sonuc.o.karsilamaOrani * 100, 2) },
                  { label: 'Talebiniz', value: `${formatNumber(talep!, 0)} lot` },
                  { label: 'Oransal payınız', value: `${formatNumber(sonuc.o.pay, 2)} lot`, kind: 'total' },
                ]}
              />
            )}
            <Callout kind="info">
              Aynı halka arza birden fazla aracı kurumdan talep verirseniz yalnızca en yüksek talebiniz dikkate alınır (SPK
              II-5.2 md. 22). Sonuç tahmindir; kesin dağıtım KAP’ta açıklanır.
            </Callout>
            <ShareBar
              params={{ yontem, lot, fiyat, kisi: yontem === 'esit' ? katilimci : null, talep, toplam: yontem === 'oransal' ? toplamTalep : null }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için alanları doldurun.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
