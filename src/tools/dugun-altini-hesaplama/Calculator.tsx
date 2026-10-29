import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  altinAyarlari,
  ayarEtiketi,
  ayarKaydi,
  cumhuriyetAltini,
  type CumhuriyetAltiniId,
} from '../../data/params/altin';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, SelectField } from '../../ui/fields';
import { Callout, DataTable, Details, ResultEmpty, ResultHero, StackedBar, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { numParam, readParams } from '../../ui/url';
import {
  butceyeGore,
  hesaplaDugunAltini,
  validateAdet,
  validateTaki,
  type Fiyat,
} from './calc';

/** Ekranda her zaman görünen ziynet türleri */
const ANA: CumhuriyetAltiniId[] = ['ceyrek', 'yarim', 'tam', 'ata', 'gremse', 'besli'];
/** "Daha fazla" bölümündeki Ata (sikke) boyları */
const EK: CumhuriyetAltiniId[] = ['ata-ceyrek', 'ata-yarim', 'ata-gremse', 'ata-besli'];
const TUMU = [...ANA, ...EK];

type FiyatAnahtari = CumhuriyetAltiniId | 'b22';
const FIYAT_ANAHTARLARI: FiyatAnahtari[] = [...ANA, 'b22'];

const AYAR_SECENEKLERI = [
  ...altinAyarlari.values.ayarlar.map((a) => ({ value: a.kod, label: ayarEtiketi(a) })),
  { value: 'ozel', label: 'Özel milyem…' },
];

interface TakiSatiri {
  id: number;
  gram: number | null;
  ayarKod: string;
  ozelMilyem: number | null;
}

const bosFiyat = (): Fiyat => ({ alis: null, satis: null });
const fiyatHata = (v: number | null) => (v !== null && (Number.isNaN(v) || v <= 0) ? 'Fiyat sıfırdan büyük olmalı.' : undefined);
const gram3 = (g: number) => `${formatNumber(g, 3)} g`;

function milyemSatiri(s: TakiSatiri): number | null {
  return s.ayarKod === 'ozel' ? s.ozelMilyem : (ayarKaydi(s.ayarKod)?.milyem ?? null);
}

export default function Calculator() {
  const sayac = useRef(1);
  const yeniTaki = (gram: number | null = null, ayarKod = '22', ozelMilyem: number | null = null): TakiSatiri => ({
    id: sayac.current++,
    gram,
    ayarKod,
    ozelMilyem,
  });

  const [adetler, setAdetler] = useState<Partial<Record<CumhuriyetAltiniId, number | null>>>({
    ceyrek: 6,
    yarim: 2,
    tam: 1,
  });
  const [takilar, setTakilar] = useState<TakiSatiri[]>(() => [yeniTaki(20, '22')]);
  const [has, setHas] = useState<Fiyat>(bosFiyat());
  const [uf, setUf] = useState<Partial<Record<FiyatAnahtari, Fiyat>>>({});
  const [butce, setButce] = useState<number | null>(null);

  useEffect(() => {
    // Paylaşılan bağlantı: ?ceyrek=6&yarim=2&alis=4500&satis=4600&taki=20:22,10:ozel:900&uf=ceyrek:7300:7600
    const p = readParams();
    const yeniAdetler: Partial<Record<CumhuriyetAltiniId, number | null>> = {};
    let adetVar = false;
    for (const id of TUMU) {
      const n = numParam(p, id);
      if (n !== null && n >= 0) {
        yeniAdetler[id] = Math.round(n);
        adetVar = true;
      }
    }
    if (adetVar) setAdetler(yeniAdetler);

    const alis = numParam(p, 'alis');
    const satis = numParam(p, 'satis');
    if (alis !== null || satis !== null) setHas({ alis, satis });

    const taki = p.get('taki');
    if (taki !== null) {
      const list = taki
        .split(',')
        .map((x) => x.split(':'))
        .filter(([g, kod]) => Number.isFinite(Number(g)) && Number(g) >= 0 && (kod === 'ozel' || ayarKaydi(kod) !== undefined))
        .slice(0, 30)
        .map(([g, kod, m]) => yeniTaki(Number(g), kod, kod === 'ozel' && Number.isFinite(Number(m)) ? Number(m) : null));
      if (list.length > 0) setTakilar(list);
      else if (taki === '') setTakilar([yeniTaki()]);
    }

    const ufRaw = p.get('uf');
    if (ufRaw) {
      const yeni: Partial<Record<FiyatAnahtari, Fiyat>> = {};
      for (const part of ufRaw.split(',')) {
        const [k, a, s] = part.split(':');
        if (!(FIYAT_ANAHTARLARI as string[]).includes(k)) continue;
        const toNum = (x?: string) => (x && Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : null);
        yeni[k as FiyatAnahtari] = { alis: toNum(a), satis: toNum(s) };
      }
      setUf(yeni);
    }
  }, []);

  const setAdet = (id: CumhuriyetAltiniId, v: number | null) => setAdetler((a) => ({ ...a, [id]: v }));
  const setUrun = (k: FiyatAnahtari, patch: Partial<Fiyat>) =>
    setUf((u) => ({ ...u, [k]: { ...(u[k] ?? bosFiyat()), ...patch } }));
  const guncelleTaki = (id: number, patch: Partial<TakiSatiri>) =>
    setTakilar((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const silTaki = (id: number) => setTakilar((l) => (l.length > 1 ? l.filter((s) => s.id !== id) : l));

  // ----- doğrulama -----
  const adetHata = (id: CumhuriyetAltiniId) => validateAdet(adetler[id] ?? null);
  const takiHata = takilar.map((s) => (s.gram === null ? {} : validateTaki(s.gram, milyemSatiri(s))));
  const fiyatHatalari = {
    hasAlis: fiyatHata(has.alis),
    hasSatis: fiyatHata(has.satis),
  };
  const ufHatasi = FIYAT_ANAHTARLARI.some((k) => fiyatHata(uf[k]?.alis ?? null) || fiyatHata(uf[k]?.satis ?? null));
  const gecerli =
    TUMU.every((id) => !adetHata(id)) &&
    takiHata.every((h) => !h.gram && !h.milyem) &&
    !fiyatHatalari.hasAlis &&
    !fiyatHatalari.hasSatis &&
    !ufHatasi;

  const urunFiyatlari = useMemo(() => {
    const o: Partial<Record<CumhuriyetAltiniId, Fiyat>> = {};
    for (const id of ANA) if (uf[id]) o[id] = uf[id];
    return o;
  }, [uf]);

  const sonuc = useMemo(() => {
    if (!gecerli) return null;
    return hesaplaDugunAltini({
      ziynet: TUMU.map((id) => ({ id, adet: adetler[id] ?? 0 })),
      takilar: takilar.map((s, i) => {
        const kayit = ayarKaydi(s.ayarKod);
        return {
          ad: `Takı ${i + 1} (${kayit ? `${kayit.ayar} ayar` : `${milyemSatiri(s) ?? '?'} milyem`})`,
          gram: s.gram ?? 0,
          milyem: milyemSatiri(s) ?? 0,
          ayar: kayit?.ayar ?? 0,
        };
      }),
      has,
      urunFiyatlari,
      bilezik22: uf.b22,
    });
  }, [gecerli, adetler, takilar, has, urunFiyatlari, uf.b22]);

  const fiyatVar = !!sonuc && (sonuc.alisToplam !== null || sonuc.satisToplam !== null);
  const alisBuyukSatis = has.alis !== null && has.satis !== null && has.alis > has.satis;

  const butceSatirlari = useMemo(
    () => (butce !== null && butce > 0 && gecerli ? butceyeGore(butce, { has, urunFiyatlari }, ANA) : []),
    [butce, gecerli, has, urunFiyatlari],
  );

  // ----- paylaşım -----
  const paylasParam: Record<string, string | number | null> = {
    alis: has.alis,
    satis: has.satis,
    taki: takilar.map((s) => `${s.gram ?? 0}:${s.ayarKod}${s.ayarKod === 'ozel' ? `:${s.ozelMilyem ?? ''}` : ''}`).join(','),
    uf:
      FIYAT_ANAHTARLARI.filter((k) => (uf[k]?.alis ?? 0) > 0 || (uf[k]?.satis ?? 0) > 0)
        .map((k) => `${k}:${uf[k]?.alis ?? ''}:${uf[k]?.satis ?? ''}`)
        .join(',') || null,
  };
  for (const id of TUMU) if ((adetler[id] ?? 0) > 0) paylasParam[id] = adetler[id] ?? null;

  const ozet = sonuc
    ? [
        'Düğün altını hesabı',
        ...sonuc.kalemler.map(
          (k) =>
            `${k.adet !== undefined ? `${k.adet} adet ` : `${formatNumber(k.brutGram, 2)} g `}${k.ad}: ${gram3(k.hasGram)} has` +
            (k.alis !== null ? `, alış değeri ${formatTL(k.alis)}` : ''),
        ),
        `Toplam: ${gram3(sonuc.hasGram)} has altın (brüt ${gram3(sonuc.brutGram)})`,
        ...(sonuc.alisToplam !== null ? [`Bozdurma değeri (alış fiyatı): ${formatTL(sonuc.alisToplam)}`] : []),
        ...(sonuc.satisToplam !== null ? [`Satış fiyatıyla değer: ${formatTL(sonuc.satisToplam)}`] : []),
      ].join('\n')
    : '';

  const adetAlani = (id: CumhuriyetAltiniId) => {
    const t = cumhuriyetAltini(id);
    return (
      <NumberField
        key={id}
        id={`da-adet-${id}`}
        label={`${t.ad} (adet)`}
        value={adetler[id] ?? null}
        onChange={(v) => setAdet(id, v)}
        decimals={0}
        inputMode="numeric"
        placeholder="0"
        error={adetHata(id)}
        hint={`${formatNumber(t.agirlik, 3)} g, 22 ayar`}
      />
    );
  };

  const urunSatiri = (k: FiyatAnahtari, ad: string, birim: string) => (
    <div class="row-2" key={k}>
      <NumberField
        id={`da-uf-${k}-alis`}
        label={`${ad} – alış (${birim})`}
        value={uf[k]?.alis ?? null}
        onChange={(v) => setUrun(k, { alis: v })}
        suffix="TL"
        error={fiyatHata(uf[k]?.alis ?? null)}
      />
      <NumberField
        id={`da-uf-${k}-satis`}
        label={`${ad} – satış (${birim})`}
        value={uf[k]?.satis ?? null}
        onChange={(v) => setUrun(k, { satis: v })}
        suffix="TL"
        error={fiyatHata(uf[k]?.satis ?? null)}
      />
    </div>
  );

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <p class="calc-section-title">1. Güncel fiyat (siz yazarsınız)</p>
        <div class="row-2">
          <NumberField
            id="da-has-alis"
            label="Has altın gram alış fiyatı"
            value={has.alis}
            onChange={(v) => setHas((h) => ({ ...h, alis: v }))}
            suffix="TL"
            placeholder="kuyumcunun sizden alacağı"
            error={fiyatHatalari.hasAlis}
          />
          <NumberField
            id="da-has-satis"
            label="Has altın gram satış fiyatı"
            value={has.satis}
            onChange={(v) => setHas((h) => ({ ...h, satis: v }))}
            suffix="TL"
            placeholder="kuyumcunun size satacağı"
            error={fiyatHatalari.hasSatis}
            hint="24 ayar (has) gram fiyatı. Siteler fiyat çekmez; bugünkü fiyatı kuyumcudan ya da fiyat ekranından yazın. Biri yeterlidir."
          />
        </div>
        <Details summary="Ürün fiyatlarını kendim girmek istiyorum (isteğe bağlı)">
          <div class="calc-inputs">
            <p class="field__hint">
              Kuyumcular çeyrek, tam ve bilezik için kendi fiyatını verir; bu fiyat has altından hesaplanan değerden farklı
              olabilir. Girdiğiniz ürün fiyatı, o ürün için has fiyatından türetilen değerin yerine geçer.
            </p>
            {ANA.map((id) => urunSatiri(id, cumhuriyetAltini(id).ad, 'adet başına'))}
            {urunSatiri('b22', '22 ayar bilezik', 'gram başına')}
          </div>
        </Details>

        <p class="calc-section-title">2. Ziynet altınları</p>
        <div class="row-2">{ANA.map(adetAlani)}</div>
        <Details summary="Daha fazla Ata (sikke) türü: çeyrek, yarım, 2,5’luk, beşli">
          <div class="row-2">{EK.map(adetAlani)}</div>
        </Details>

        <p class="calc-section-title">3. Bilezik, takı ve gram altın</p>
        <ul class="line-items">
          {takilar.map((s, i) => (
            <li class="line-item" key={s.id}>
              <div class="line-item__head">
                <span>Takı {i + 1}</span>
                {takilar.length > 1 && (
                  <button type="button" class="line-item__remove" onClick={() => silTaki(s.id)} aria-label={`Takı ${i + 1}’i sil`}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              <div class="line-item__fields">
                <NumberField
                  id={`da-taki-gram-${s.id}`}
                  label="Ağırlık"
                  value={s.gram}
                  onChange={(v) => guncelleTaki(s.id, { gram: v })}
                  suffix="gram"
                  decimals={3}
                  placeholder="ör. 20"
                  error={takiHata[i].gram}
                />
                <SelectField
                  id={`da-taki-ayar-${s.id}`}
                  label="Ayar"
                  value={s.ayarKod}
                  onChange={(v) => guncelleTaki(s.id, { ayarKod: v })}
                  options={AYAR_SECENEKLERI}
                />
              </div>
              {s.ayarKod === 'ozel' && (
                <NumberField
                  id={`da-taki-milyem-${s.id}`}
                  label="Milyem (binde saf altın)"
                  value={s.ozelMilyem}
                  onChange={(v) => guncelleTaki(s.id, { ozelMilyem: v })}
                  decimals={1}
                  placeholder="ör. 900"
                  error={takiHata[i].milyem}
                  hint="Ürünün üzerindeki damga (ör. 916, 750, 585) ya da ayar raporundaki değer."
                />
              )}
            </li>
          ))}
        </ul>
        <button type="button" class="btn btn--small add-row" onClick={() => setTakilar((l) => [...l, yeniTaki(null, l[l.length - 1]?.ayarKod ?? '22', null)])}>
          + Takı ekle
        </button>
      </div>

      <div class="calc-results">
        {sonuc && sonuc.kalemler.length > 0 ? (
          <>
            {sonuc.alisToplam !== null ? (
              <ResultHero
                label="Bozdurma değeri (kuyumcu alış fiyatıyla)"
                value={formatTL(sonuc.alisToplam)}
                sub={
                  <>
                    Toplam <strong>{gram3(sonuc.hasGram)}</strong> has altın · brüt {gram3(sonuc.brutGram)}
                  </>
                }
              />
            ) : sonuc.satisToplam !== null ? (
              <ResultHero
                label="Değer (kuyumcu satış fiyatıyla)"
                value={formatTL(sonuc.satisToplam)}
                sub={
                  <>
                    Toplam <strong>{gram3(sonuc.hasGram)}</strong> has altın · brüt {gram3(sonuc.brutGram)}
                  </>
                }
              />
            ) : (
              <ResultHero
                label="Toplam has (saf) altın"
                value={gram3(sonuc.hasGram)}
                sub={<>Brüt ağırlık {gram3(sonuc.brutGram)}</>}
              />
            )}

            {!fiyatVar && (
              <Callout kind="info">
                Altınlarınızın TL değerini görmek için yukarıya güncel has (24 ayar) gram fiyatını yazın. Gram sonuçları
                fiyattan bağımsızdır.
              </Callout>
            )}

            <StatGrid
              items={[
                { label: 'Has (saf) altın', value: gram3(sonuc.hasGram) },
                { label: 'Brüt ağırlık', value: gram3(sonuc.brutGram) },
                ...(sonuc.satisToplam !== null ? [{ label: 'Satış fiyatıyla değer', value: formatTL(sonuc.satisToplam) }] : []),
                ...(sonuc.makas !== null && sonuc.makasOrani !== null
                  ? [{ label: 'Alış–satış farkı', value: `${formatTL(sonuc.makas)} (${formatPercent(sonuc.makasOrani)})` }]
                  : []),
              ]}
            />

            <DataTable
              caption="Tür bazında döküm"
              columns={[
                { key: 'ad', label: 'Tür' },
                { key: 'miktar', label: 'Miktar' },
                { key: 'has', label: 'Has altın' },
                { key: 'alis', label: 'Alış değeri' },
                { key: 'satis', label: 'Satış değeri' },
              ]}
              rows={sonuc.kalemler.map((k) => ({
                ad: k.ozelFiyat ? `${k.ad} *` : k.ad,
                miktar: k.adet !== undefined ? `${k.adet} adet` : `${formatNumber(k.brutGram, 3)} g`,
                has: gram3(k.hasGram),
                alis: k.alis !== null ? formatTL(k.alis) : '–',
                satis: k.satis !== null ? formatTL(k.satis) : '–',
              }))}
              foot={{
                ad: 'Toplam',
                miktar: gram3(sonuc.brutGram),
                has: gram3(sonuc.hasGram),
                alis: sonuc.alisToplam !== null ? formatTL(sonuc.alisToplam) : '–',
                satis: sonuc.satisToplam !== null ? formatTL(sonuc.satisToplam) : '–',
              }}
            />
            {sonuc.kalemler.some((k) => k.ozelFiyat) && (
              <p class="field__hint">* Bu satırda sizin girdiğiniz ürün fiyatı kullanıldı.</p>
            )}

            {sonuc.kalemler.length > 1 && (
              <StackedBar
                label="Has altının türlere göre dağılımı"
                parts={sonuc.kalemler.map((k) => ({ label: k.ad, value: k.hasGram, display: gram3(k.hasGram) }))}
              />
            )}

            {alisBuyukSatis && (
              <Callout kind="warning">
                Alış fiyatını ({formatTL(has.alis ?? 0)}) satış fiyatından ({formatTL(has.satis ?? 0)}) yüksek girdiniz.
                Kuyumcuda alış fiyatı genellikle satış fiyatının altındadır; kutuları kontrol edin.
              </Callout>
            )}

            {sonuc.makas !== null && sonuc.makasOrani !== null && sonuc.satisToplam !== null && sonuc.alisToplam !== null && (
              <Callout kind="info">
                <strong>Bozdururken satış değil, alış fiyatı esas alınır.</strong> Bu altınları bugün kuyumcudan
                satın alsaydınız {formatTL(sonuc.satisToplam)}, kuyumcuya satsanız {formatTL(sonuc.alisToplam)} alırdınız.
                Aradaki {formatTL(sonuc.makas)} (satış değerinin {formatPercent(sonuc.makasOrani)}) alış–satış farkıdır;
                takı ve bileziklerde satın alırken ödenen işçilik de çoğunlukla geri alınmaz.
              </Callout>
            )}

            {fiyatVar && (
              <Details summary="Bütçeyle kaç adet alınır? (ters hesap)">
                <div class="calc-inputs">
                  <NumberField
                    id="da-butce"
                    label="Düğün altını bütçesi"
                    value={butce}
                    onChange={setButce}
                    suffix="TL"
                    placeholder="ör. 100.000"
                    hint="Satın alırken kuyumcunun satış fiyatı geçerlidir."
                  />
                  {butceSatirlari.length > 0 ? (
                    <DataTable
                      columns={[
                        { key: 'tur', label: 'Tür' },
                        { key: 'fiyat', label: 'Adet fiyatı (satış)' },
                        { key: 'adet', label: 'Alınabilecek adet' },
                        { key: 'kalan', label: 'Artan' },
                      ]}
                      rows={butceSatirlari.map((b) => ({
                        tur: cumhuriyetAltini(b.id).ad,
                        fiyat: formatTL(b.birimSatis),
                        adet: `${b.adet} adet`,
                        kalan: formatTL(b.kalan),
                      }))}
                    />
                  ) : (
                    butce !== null && butce > 0 && <p class="field__hint">Bu hesap için satış fiyatı gerekir; satış fiyatını girin.</p>
                  )}
                </div>
              </Details>
            )}

            <ShareBar params={paylasParam} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>
            {gecerli
              ? 'Hesap için en az bir ziynet altını adedi ya da bir takının gramını girin.'
              : 'Sonucu görmek için kırmızı işaretli alanları düzeltin.'}
          </ResultEmpty>
        )}
      </div>
    </div>
  );
}
