import { useMemo, useRef, useState } from 'preact/hooks';
import { verasetVergisi } from '../../data/params/veraset';
import { formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StackedBar } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { bagisVergisi, deger, kesirMetni, verasetHesapla, yasalPaylar } from './calc';

type Mod = 'miras' | 'bagis';

interface Varlik {
  id: number;
  ad: string;
  deger: number | null;
}
interface CocukSatiri {
  id: number;
  durum: 'sag' | 'vefat';
  torun: number | null;
}

const silIkon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
  </svg>
);

const v = verasetVergisi.values;

export default function Calculator() {
  const sayac = useRef(100);
  const [mod, setMod] = useState<Mod>('miras');
  const [varliklar, setVarliklar] = useState<Varlik[]>([
    { id: 1, ad: 'Ev (emlak vergi değeri)', deger: 6_000_000 },
    { id: 2, ad: 'Banka hesapları', deger: 3_000_000 },
    { id: 3, ad: 'Araç', deger: 1_000_000 },
  ]);
  const [borc, setBorc] = useState<number | null>(0);
  const [es, setEs] = useState(true);
  const [cocuklar, setCocuklar] = useState<CocukSatiri[]>([
    { id: 10, durum: 'sag', torun: null },
    { id: 11, durum: 'sag', torun: null },
  ]);
  const [anne, setAnne] = useState(false);
  const [baba, setBaba] = useState(false);
  const [kardes, setKardes] = useState<number | null>(0);
  const [zumre3, setZumre3] = useState(false);
  const [bagis, setBagis] = useState<number | null>(1_000_000);

  const brut = varliklar.reduce((t, x) => t + (x.deger ?? 0), 0);
  const netTereke = Math.max(0, brut - (borc ?? 0));
  const aile = {
    es,
    cocuklar: cocuklar.map((c) => ({ sag: c.durum === 'sag', torunSayisi: c.durum === 'vefat' ? Math.max(0, Math.floor(c.torun ?? 0)) : 0 })),
    anne,
    baba,
    kardes: Math.max(0, Math.floor(kardes ?? 0)),
    zumre3,
  };
  const altsoyVar = aile.cocuklar.some((c) => c.sag || c.torunSayisi > 0);
  const ikinciZumreVar = !altsoyVar && (anne || baba || aile.kardes > 0);

  const sonuc = useMemo(() => {
    if (mod !== 'miras' || netTereke <= 0) return null;
    const p = yasalPaylar(aile);
    const satirlar = verasetHesapla(netTereke, p);
    return { p, satirlar, toplamVergi: satirlar.reduce((t, s) => t + s.vergi, 0) };
  }, [mod, netTereke, JSON.stringify(aile)]);
  const b = mod === 'bagis' && bagis !== null && bagis > 0 ? bagisVergisi(bagis) : null;

  const guncelleCocuk = (id: number, alan: Partial<CocukSatiri>) => setCocuklar((l) => l.map((x) => (x.id === id ? { ...x, ...alan } : x)));

  let ozet = '';
  if (sonuc) {
    ozet = [
      `Net tereke: ${formatTL(netTereke, 0)}`,
      ...sonuc.satirlar.map((s) => `${s.ad}: ${kesirMetni(s.yasal)} = ${formatTL(s.tutar, 0)}, vergi ${formatTL(s.vergi)}`),
      `Toplam veraset vergisi: ${formatTL(sonuc.toplamVergi)}`,
    ].join('\n');
  } else if (b) {
    ozet = `Bağış: ${formatTL(bagis!, 0)}\nVeraset ve intikal vergisi: ${formatTL(b.vergi)}`;
  }

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="mi-mod"
          label="Ne hesaplanacak?"
          value={mod}
          onChange={setMod}
          options={[
            { value: 'miras', label: 'Miras paylaşımı ve vergisi' },
            { value: 'bagis', label: 'Bağış / hibe vergisi' },
          ]}
        />

        {mod === 'bagis' ? (
          <NumberField
            id="mi-bagis"
            label="Bağışlanan tutar veya malın değeri"
            value={bagis}
            onChange={setBagis}
            suffix="TL"
            hint="Taşınmazda emlak vergi değeri esas alınır. Vergiyi bağışı alan öder."
          />
        ) : (
          <>
            <div class="field">
              <span class="field__label">Miras kalan mal varlığı</span>
              <ul class="line-items">
                {varliklar.map((x, i) => (
                  <li class="line-item" key={x.id}>
                    <div class="line-item__head">
                      <span>Varlık {i + 1}</span>
                      {varliklar.length > 1 && (
                        <button
                          type="button"
                          class="line-item__remove"
                          aria-label={`${x.ad || `Varlık ${i + 1}`} satırını sil`}
                          onClick={() => setVarliklar((l) => l.filter((y) => y.id !== x.id))}
                        >
                          {silIkon}
                        </button>
                      )}
                    </div>
                    <div class="line-item__fields">
                      <TextField id={`mi-vad-${x.id}`} label="Ne?" value={x.ad} onChange={(val) => setVarliklar((l) => l.map((y) => (y.id === x.id ? { ...y, ad: val } : y)))} />
                      <NumberField
                        id={`mi-vde-${x.id}`}
                        label="Değeri"
                        value={x.deger}
                        onChange={(val) => setVarliklar((l) => l.map((y) => (y.id === x.id ? { ...y, deger: val } : y)))}
                        suffix="TL"
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" class="btn btn--small add-row" onClick={() => setVarliklar((l) => [...l, { id: sayac.current++, ad: '', deger: null }])}>
                + Varlık ekle
              </button>
            </div>
            <NumberField
              id="mi-borc"
              label="Borçlar ve cenaze masrafları"
              value={borc}
              onChange={setBorc}
              suffix="TL"
              hint="Miras bırakanın borçları ve cenaze giderleri mirastan düşülür."
            />

            <div class="field">
              <span class="field__label">Geride kalanlar</span>
              <CheckboxField id="mi-es" label="Eşi hayatta" checked={es} onChange={setEs} />
              <ul class="line-items">
                {cocuklar.map((c, i) => (
                  <li class="line-item" key={c.id}>
                    <div class="line-item__head">
                      <span>{i + 1}. çocuk</span>
                      <button
                        type="button"
                        class="line-item__remove"
                        aria-label={`${i + 1}. çocuğu sil`}
                        onClick={() => setCocuklar((l) => l.filter((y) => y.id !== c.id))}
                      >
                        {silIkon}
                      </button>
                    </div>
                    <div class="line-item__fields">
                      <SelectField
                        id={`mi-cd-${c.id}`}
                        label="Durumu"
                        value={c.durum}
                        onChange={(d) => guncelleCocuk(c.id, { durum: d })}
                        options={[
                          { value: 'sag', label: 'Hayatta' },
                          { value: 'vefat', label: 'Daha önce vefat etti' },
                        ]}
                      />
                      {c.durum === 'vefat' && (
                        <NumberField
                          id={`mi-ct-${c.id}`}
                          label="Onun çocuk sayısı"
                          value={c.torun}
                          onChange={(t) => guncelleCocuk(c.id, { torun: t })}
                          decimals={0}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" class="btn btn--small add-row" onClick={() => setCocuklar((l) => [...l, { id: sayac.current++, durum: 'sag', torun: null }])}>
                + Çocuk ekle
              </button>
              <p class="field__hint" style={{ margin: 0 }}>
                Evlatlıklar da çocuk sayılır. {altsoyVar ? 'Çocuk veya torun varken anne-baba ve kardeşler mirasçı olmaz.' : ''}
              </p>
            </div>

            {!altsoyVar && (
              <div class="field">
                <span class="field__label">Çocuk veya torun yoksa</span>
                <CheckboxField id="mi-anne" label="Annesi hayatta" checked={anne} onChange={setAnne} />
                <CheckboxField id="mi-baba" label="Babası hayatta" checked={baba} onChange={setBaba} />
                <NumberField
                  id="mi-kardes"
                  label="Kardeş sayısı (anne ve baba bir)"
                  value={kardes}
                  onChange={setKardes}
                  decimals={0}
                  hint="Vefat eden ebeveynin payı kardeşlere geçer."
                />
                {!ikinciZumreVar && (
                  <CheckboxField
                    id="mi-zumre3"
                    label="Büyükanne, büyükbaba ya da amca, hala, dayı, teyze var"
                    checked={zumre3}
                    onChange={setZumre3}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div class="calc-results">
        {mod === 'bagis' ? (
          b ? (
            <>
              <ResultHero
                label="Bağışta veraset ve intikal vergisi"
                value={formatTL(b.vergi)}
                sub={<>Efektif oran {formatPercent(b.efektif, 2)}</>}
              />
              <Breakdown
                rows={[
                  { label: 'Bağışlanan', value: formatTL(bagis!) },
                  { label: 'İstisna (ivazsız intikal)', value: formatTL(b.istisna), kind: 'minus' },
                  { label: 'Vergi matrahı', value: formatTL(b.matrah) },
                  { label: 'Vergi (%10’dan %30’a kadar dilimli)', value: formatTL(b.vergi), kind: 'total' },
                ]}
              />
              <Callout kind="info">
                Bağışta oranlar mirasa göre çok daha yüksektir. Vergi, beyannameyi izleyen yıldan başlayarak 3 yılda ve 6 eşit taksitte (Mayıs ve
                Kasım) ödenebilir.
              </Callout>
              <ShareBar params={{}} summary={ozet} />
            </>
          ) : (
            <ResultEmpty>Bağışlanan tutarı girin.</ResultEmpty>
          )
        ) : sonuc ? (
          <>
            <ResultHero
              label="Mirasçıların ödeyeceği toplam veraset vergisi"
              value={formatTL(sonuc.toplamVergi)}
              sub={
                <>
                  Net miras <strong>{formatTL(netTereke, 0)}</strong> · {sonuc.satirlar.length} mirasçı
                </>
              }
            />
            {sonuc.toplamVergi === 0 && sonuc.satirlar.some((s) => s.tur !== 'hazine') && (
              <Callout kind="success">Payların tamamı istisna sınırının altında kaldığı için veraset vergisi çıkmıyor. Beyanname yine de verilmelidir.</Callout>
            )}
            <DataTable
              caption="Yasal miras payları ve vergi"
              columns={[
                { key: 'a', label: 'Mirasçı' },
                { key: 'p', label: 'Yasal pay' },
                { key: 't', label: 'Tutar' },
                { key: 's', label: 'Saklı pay' },
                { key: 'i', label: 'İstisna' },
                { key: 'v', label: 'Vergi' },
              ]}
              rows={sonuc.satirlar.map((s) => ({
                a: s.ad,
                p: `${kesirMetni(s.yasal)} (${formatPercent(deger(s.yasal) * 100, 2)})`,
                t: formatTL(s.tutar, 0),
                s: s.sakli ? `${kesirMetni(s.sakli)} · ${formatTL(s.sakliTutar!, 0)}` : 'Yok',
                i: s.tur === 'hazine' ? '—' : formatTL(s.istisna, 0),
                v: s.tur === 'hazine' ? '—' : formatTL(s.vergi),
              }))}
              foot={{ a: 'Toplam', p: 'Tamamı', t: formatTL(netTereke, 0), s: '', i: '', v: formatTL(sonuc.toplamVergi) }}
            />
            <StackedBar
              label="Mirasın paylaşımı"
              parts={sonuc.satirlar.map((s) => ({ label: s.ad, value: s.tutar, display: formatTL(s.tutar, 0) }))}
            />
            <Breakdown
              rows={[
                { label: 'Mal varlığı toplamı', value: formatTL(brut, 0) },
                ...((borc ?? 0) > 0 ? [{ label: 'Borçlar ve cenaze masrafları', value: formatTL(borc!, 0), kind: 'minus' as const }] : []),
                { label: 'Paylaşılacak net miras', value: formatTL(netTereke, 0), kind: 'total' },
                {
                  label: 'Vasiyetle serbestçe bırakılabilecek kısım',
                  value: `${kesirMetni(sonuc.p.tasarrufNisabi)} · ${formatTL(netTereke * deger(sonuc.p.tasarrufNisabi), 0)}`,
                  hint: 'Saklı paylar dışında kalan kısım (tasarruf nisabı)',
                },
              ]}
            />
            <Details summary="Bilmeniz gerekenler">
              <ul>
                <li>
                  Evli çiftlerde önce mal rejimi tasfiye edilir: evlilikte edinilen mallarda eşin katılma alacağı (genellikle yarısı) mirastan önce
                  ayrılır. Buraya yalnızca miras bırakana ait kısmı yazın.
                </li>
                <li>Vergi her mirasçının kendi payı üzerinden ayrı hesaplanır; taşınmazlarda piyasa değeri değil emlak vergi değeri esas alınır.</li>
                <li>
                  Çocuklar ve eş için istisna kişi başı {formatTL(v.istisnaAltsoyVeEs, 0)}; çocuk yoksa eş için {formatTL(v.istisnaEsTek, 0)}. Anne,
                  baba ve kardeşler istisnadan yararlanamaz.
                </li>
                <li>Beyanname ölümden itibaren 4 ay içinde verilir; vergi 3 yılda 6 eşit taksitte (Mayıs ve Kasım) ödenir.</li>
                <li>Vasiyetname veya miras sözleşmesi varsa paylar değişebilir; saklı paylar ise vasiyetle azaltılamaz.</li>
              </ul>
            </Details>
            <Callout kind="warning">
              Bu araç yasal mirasçılığa göre genel bir hesap yapar; hukuki danışmanlık değildir. Üvey kardeşler, evlilik dışı çocuklar, mirastan
              feragat veya ret gibi durumlarda bir avukata ya da noter ve vergi dairesine danışın.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Mal varlığı değerlerini girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}
