import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { altinAyarlari, ayarEtiketi, ayarKaydi } from '../../data/params/altin';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { enumParam, numParam, readParams } from '../../ui/url';
import {
  donustur,
  esdegerTablosu,
  hesaplaIscilik,
  validateFiyat,
  validateKesinti,
  validateSatir,
  type IscilikBirimi,
  type IscilikModu,
} from './calc';

const AYAR_SECENEKLERI = [
  ...altinAyarlari.values.ayarlar.map((a) => ({ value: a.kod, label: ayarEtiketi(a) })),
  { value: 'ozel', label: 'Özel milyem…' },
];
const DONUSUM_SECENEKLERI = altinAyarlari.values.ayarlar.map((a) => ({ value: a.kod, label: ayarEtiketi(a) }));
/** Eşdeğer gram tablosunda gösterilen standart ayarlar */
const TABLO_AYARLARI = ['24', '22', '21', '18', '14', '10', '9', '8'];

interface Satir {
  id: number;
  gram: number | null;
  ayarKod: string;
  ozelMilyem: number | null;
  odenen: number | null;
  iscilik: number | null;
}

const g3 = (n: number) => `${formatNumber(n, 3)} g`;
const milyemOfSatir = (s: Satir): number | null => (s.ayarKod === 'ozel' ? s.ozelMilyem : (ayarKaydi(s.ayarKod)?.milyem ?? null));

export default function Calculator() {
  const sayac = useRef(1);
  const yeniSatir = (gram: number | null = null, ayarKod = '22', ozelMilyem: number | null = null, odenen: number | null = null, iscilik: number | null = null): Satir => ({
    id: sayac.current++,
    gram,
    ayarKod,
    ozelMilyem,
    odenen,
    iscilik,
  });

  const [mod, setMod] = useState<IscilikModu>('odenenden');
  const [birim, setBirim] = useState<IscilikBirimi>('yuzde');
  const [satirlar, setSatirlar] = useState<Satir[]>(() => [yeniSatir(10, '22')]);
  const [alimFiyat, setAlimFiyat] = useState<number | null>(null);
  const [bozdurmaAlis, setBozdurmaAlis] = useState<number | null>(null);
  const [kesinti, setKesinti] = useState<number | null>(null);
  const [donGram, setDonGram] = useState<number | null>(10);
  const [donKaynak, setDonKaynak] = useState('14');
  const [donHedef, setDonHedef] = useState('22');

  useEffect(() => {
    // Paylaşılan bağlantı: ?mod=odenenden&alim=4000&alis=3900&kes=5&taki=10:22::40000:,5:18::17500:
    const p = readParams();
    const m = enumParam(p, 'mod', ['odenenden', 'orandan'] as const);
    if (m) setMod(m);
    const b = enumParam(p, 'birim', ['yuzde', 'tl-gram'] as const);
    if (b) setBirim(b);
    const a = numParam(p, 'alim');
    if (a !== null) setAlimFiyat(a);
    const al = numParam(p, 'alis');
    if (al !== null) setBozdurmaAlis(al);
    const k = numParam(p, 'kes');
    if (k !== null) setKesinti(k);
    const taki = p.get('taki');
    if (taki) {
      const num = (x?: string) => (x && Number.isFinite(Number(x)) ? Number(x) : null);
      const list = taki
        .split(',')
        .map((x) => x.split(':'))
        .filter(([g, kod]) => num(g) !== null && num(g)! >= 0 && (kod === 'ozel' || ayarKaydi(kod) !== undefined))
        .slice(0, 30)
        .map(([g, kod, mil, od, isc]) => yeniSatir(num(g), kod, kod === 'ozel' ? num(mil) : null, num(od), num(isc)));
      if (list.length > 0) setSatirlar(list);
    }
  }, []);

  const guncelle = (id: number, patch: Partial<Satir>) => setSatirlar((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const sil = (id: number) => setSatirlar((l) => (l.length > 1 ? l.filter((s) => s.id !== id) : l));

  const satirHatalari = satirlar.map((s) => validateSatir({ gram: s.gram, milyem: milyemOfSatir(s), odenen: s.odenen, iscilik: s.iscilik }, mod, birim));
  const fiyatHatalari = validateFiyat(alimFiyat, bozdurmaAlis);
  const kesintiHatasi = validateKesinti(kesinti);
  const gecerli =
    satirHatalari.every((h) => !h.gram && !h.milyem && !h.odenen && !h.iscilik) &&
    !fiyatHatalari.alim &&
    !fiyatHatalari.alis &&
    !kesintiHatasi;

  const sonuc = useMemo(
    () =>
      gecerli
        ? hesaplaIscilik({
            takilar: satirlar.map((s, i) => {
              const kayit = ayarKaydi(s.ayarKod);
              return {
                ad: `Takı ${i + 1}`,
                gram: s.gram ?? 0,
                milyem: milyemOfSatir(s) ?? 0,
                ayar: kayit?.ayar ?? 0,
                odenen: s.odenen,
                iscilik: s.iscilik,
              };
            }),
            mod,
            iscilikBirimi: birim,
            alimHasFiyati: alimFiyat,
            bozdurmaHasAlis: bozdurmaAlis,
            bozdurmaKesinti: kesinti ?? 0,
          })
        : null,
    [gecerli, satirlar, mod, birim, alimFiyat, bozdurmaAlis, kesinti],
  );

  const esdeger = useMemo(() => {
    if (!sonuc || sonuc.hasGram <= 0) return [];
    const liste = altinAyarlari.values.ayarlar.filter((a) => TABLO_AYARLARI.includes(a.kod));
    return esdegerTablosu(sonuc.hasGram, liste);
  }, [sonuc]);

  const donSonuc = (() => {
    const kaynak = ayarKaydi(donKaynak)?.milyem;
    const hedef = ayarKaydi(donHedef)?.milyem;
    if (donGram === null || Number.isNaN(donGram) || donGram < 0 || !kaynak || !hedef) return null;
    return donustur(donGram, kaynak, hedef);
  })();

  const ozet = sonuc
    ? [
        'Altın ayar ve işçilik hesabı',
        ...sonuc.satirlar.map(
          (s) =>
            `${s.ad}: ${formatNumber(s.gram, 3)} g, ${s.milyem} milyem → ${g3(s.hasGram)} has` +
            (s.iscilikTL !== null ? `, işçilik ${formatTL(s.iscilikTL)}${s.iscilikOrani !== null ? ` (${formatPercent(s.iscilikOrani)})` : ''}` : ''),
        ),
        `Toplam has altın: ${g3(sonuc.hasGram)}`,
        ...(sonuc.altinDegeri !== null ? [`Altın değeri: ${formatTL(sonuc.altinDegeri)}`] : []),
        ...(sonuc.iscilikTL !== null ? [`İşçilik: ${formatTL(sonuc.iscilikTL)}`] : []),
        ...(sonuc.bozdurma !== null ? [`Bozdurma değeri: ${formatTL(sonuc.bozdurma)}`] : []),
      ].join('\n')
    : '';

  const paylasimTaki = satirlar
    .map((s) => `${s.gram ?? 0}:${s.ayarKod}:${s.ayarKod === 'ozel' ? (s.ozelMilyem ?? '') : ''}:${s.odenen ?? ''}:${s.iscilik ?? ''}`)
    .join(',');

  const odenenden = mod === 'odenenden';
  const isciliktenFiyat = sonuc !== null && sonuc.iscilikTL !== null;
  const bosSonuc = sonuc === null || sonuc.satirlar.length === 0;

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="ai-mod"
          label="Ne hesaplamak istiyorsunuz?"
          value={mod}
          onChange={setMod}
          options={[
            { value: 'odenenden', label: 'Ödediğim fiyattan işçiliği bul' },
            { value: 'orandan', label: 'İşçilikten toplam fiyatı bul' },
          ]}
          hint={
            odenenden
              ? 'Aldığınız takının fişi ya da fiyatı elinizdeyse: ödediğiniz tutarın ne kadarının altın, ne kadarının işçilik olduğunu görün.'
              : 'Kuyumcu “gramı şu kadar, işçiliği şu” diyorsa: toplam fiyatın ne olacağını önceden hesaplayın.'
          }
        />

        <p class="calc-section-title">1. Fiyatlar (siz yazarsınız)</p>
        <div class="row-2">
          <NumberField
            id="ai-alim"
            label={odenenden ? 'Aldığınız gün has gram fiyatı' : 'Has gram fiyatı (kuyumcu satış)'}
            value={alimFiyat}
            onChange={setAlimFiyat}
            suffix="TL"
            placeholder="ör. 4.000"
            error={fiyatHatalari.alim}
            hint="24 ayar (has) gram fiyatı. İşçilik, ödenen tutarla bu fiyattaki altın değeri arasındaki farktır."
          />
          <NumberField
            id="ai-alis"
            label="Bugünkü has gram alış fiyatı"
            value={bozdurmaAlis}
            onChange={setBozdurmaAlis}
            suffix="TL"
            placeholder="bozdurma için (isteğe bağlı)"
            error={fiyatHatalari.alis}
            hint="Kuyumcunun sizden altın alırken uyguladığı has gram fiyatı."
          />
        </div>

        {!odenenden && (
          <Segmented
            name="ai-birim"
            label="İşçiliği nasıl söylüyorlar?"
            value={birim}
            onChange={setBirim}
            options={[
              { value: 'yuzde', label: 'Altın değerinin %’si' },
              { value: 'tl-gram', label: 'Gram başına TL' },
            ]}
          />
        )}

        <p class="calc-section-title">2. Takılar</p>
        <ul class="line-items">
          {satirlar.map((s, i) => (
            <li class="line-item" key={s.id}>
              <div class="line-item__head">
                <span>Takı {i + 1}</span>
                {satirlar.length > 1 && (
                  <button type="button" class="line-item__remove" onClick={() => sil(s.id)} aria-label={`Takı ${i + 1}’i sil`}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              <div class="line-item__fields">
                <NumberField
                  id={`ai-gram-${s.id}`}
                  label="Ağırlık"
                  value={s.gram}
                  onChange={(v) => guncelle(s.id, { gram: v })}
                  suffix="gram"
                  decimals={3}
                  placeholder="ör. 10"
                  error={satirHatalari[i].gram}
                />
                <SelectField
                  id={`ai-ayar-${s.id}`}
                  label="Ayar"
                  value={s.ayarKod}
                  onChange={(v) => guncelle(s.id, { ayarKod: v })}
                  options={AYAR_SECENEKLERI}
                />
              </div>
              {s.ayarKod === 'ozel' && (
                <NumberField
                  id={`ai-milyem-${s.id}`}
                  label="Milyem (binde saf altın)"
                  value={s.ozelMilyem}
                  onChange={(v) => guncelle(s.id, { ozelMilyem: v })}
                  decimals={1}
                  placeholder="ör. 900"
                  error={satirHatalari[i].milyem}
                  hint="Ürünün üzerindeki damga ya da ayar raporundaki değer."
                />
              )}
              {odenenden ? (
                <NumberField
                  id={`ai-odenen-${s.id}`}
                  label="Ödediğiniz toplam tutar"
                  value={s.odenen}
                  onChange={(v) => guncelle(s.id, { odenen: v })}
                  suffix="TL"
                  placeholder="işçilik dahil"
                  error={satirHatalari[i].odenen}
                />
              ) : (
                <NumberField
                  id={`ai-iscilik-${s.id}`}
                  label={birim === 'yuzde' ? 'İşçilik oranı' : 'İşçilik (gram başına)'}
                  value={s.iscilik}
                  onChange={(v) => guncelle(s.id, { iscilik: v })}
                  suffix={birim === 'yuzde' ? '%' : 'TL / g'}
                  placeholder={birim === 'yuzde' ? 'ör. 8' : 'ör. 300'}
                  error={satirHatalari[i].iscilik}
                />
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          class="btn btn--small add-row"
          onClick={() => setSatirlar((l) => [...l, yeniSatir(null, l[l.length - 1]?.ayarKod ?? '22')])}
        >
          + Takı ekle
        </button>

        <Details summary="Bozdurma kesintisi (isteğe bağlı)">
          <NumberField
            id="ai-kesinti"
            label="Kuyumcunun bozdururken uyguladığı kesinti"
            value={kesinti}
            onChange={setKesinti}
            suffix="%"
            placeholder="0"
            error={kesintiHatasi}
            hint="Bazı kuyumcular eski takıyı has değerinden kesinti yaparak alır (ayar kontrolü, fire vb.). Sormadan emin değilseniz boş bırakın."
          />
        </Details>

        <Details summary="Ayar dönüştürücü: aynı altın başka ayarda kaç gram?">
          <div class="calc-inputs">
            <NumberField
              id="ai-don-gram"
              label="Ağırlık"
              value={donGram}
              onChange={setDonGram}
              suffix="gram"
              decimals={3}
            />
            <div class="row-2">
              <SelectField id="ai-don-kaynak" label="Mevcut ayar" value={donKaynak} onChange={setDonKaynak} options={DONUSUM_SECENEKLERI} />
              <SelectField id="ai-don-hedef" label="Hedef ayar" value={donHedef} onChange={setDonHedef} options={DONUSUM_SECENEKLERI} />
            </div>
            {donSonuc !== null && donGram !== null && (
              <Callout kind="success">
                {formatNumber(donGram, 3)} g {ayarKaydi(donKaynak)?.ayar} ayar altın, saf altın bakımından{' '}
                <strong>{formatNumber(donSonuc, 3)} g</strong> {ayarKaydi(donHedef)?.ayar} ayar altına eşittir.
              </Callout>
            )}
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {!bosSonuc && sonuc ? (
          <>
            {isciliktenFiyat ? (
              odenenden ? (
                <ResultHero
                  label="Ödediğiniz işçilik"
                  value={formatTL(sonuc.iscilikTL ?? 0)}
                  sub={
                    sonuc.iscilikOrani !== null ? (
                      <>
                        Altın değerinin <strong>{formatPercent(sonuc.iscilikOrani)}</strong>’i
                        {sonuc.iscilikGramBasina !== null && <> · gram başına {formatTL(sonuc.iscilikGramBasina)}</>}
                      </>
                    ) : undefined
                  }
                />
              ) : (
                <ResultHero
                  label="Toplam fiyat (altın + işçilik)"
                  value={formatTL(sonuc.odenen ?? 0)}
                  sub={
                    <>
                      Altın {formatTL(sonuc.altinDegeri ?? 0)} + işçilik <strong>{formatTL(sonuc.iscilikTL ?? 0)}</strong>
                    </>
                  }
                />
              )
            ) : (
              <ResultHero
                label="Toplam has (saf) altın"
                value={g3(sonuc.hasGram)}
                sub={<>Brüt ağırlık {g3(sonuc.gram)}</>}
              />
            )}

            {!isciliktenFiyat && (
              <Callout kind="info">
                {alimFiyat === null
                  ? 'İşçiliği görmek için alım günü has gram fiyatını yazın.'
                  : odenenden
                    ? 'İşçiliği görmek için her takının ödediğiniz toplam tutarını yazın.'
                    : 'Toplam fiyatı görmek için her takının işçilik değerini yazın.'}
              </Callout>
            )}

            <StatGrid
              items={[
                { label: 'Has (saf) altın', value: g3(sonuc.hasGram) },
                { label: 'Brüt ağırlık', value: g3(sonuc.gram) },
                ...(sonuc.altinDegeri !== null ? [{ label: 'Altın değeri', value: formatTL(sonuc.altinDegeri) }] : []),
                ...(sonuc.bozdurma !== null ? [{ label: 'Bozdurma değeri', value: formatTL(sonuc.bozdurma) }] : []),
              ]}
            />

            {sonuc.iscilikTL !== null && sonuc.altinDegeri !== null && sonuc.odenen !== null && (
              <Breakdown
                title="Fiyatın içeriği"
                rows={[
                  { label: 'Saf altın değeri', value: formatTL(sonuc.altinDegeri) },
                  {
                    label: 'İşçilik farkı',
                    value: formatTL(sonuc.iscilikTL),
                    kind: sonuc.iscilikTL >= 0 ? 'plus' : 'minus',
                    hint:
                      sonuc.iscilikOrani !== null
                        ? `Altın değerinin ${formatPercent(sonuc.iscilikOrani)}’i · gram başına ${formatTL(sonuc.iscilikGramBasina ?? 0)}`
                        : undefined,
                  },
                  { label: 'Toplam', value: formatTL(sonuc.odenen), kind: 'total' },
                ]}
              />
            )}

            {sonuc.iscilikTL !== null && sonuc.iscilikTL < 0 && (
              <Callout kind="warning">
                Ödediğiniz tutar, girdiğiniz fiyattaki altın değerinin altında kaldı. Alım günü fiyatını ya da tutarı
                kontrol edin; kuyumcular çoğunlukla altın değerine işçilik ekler.
              </Callout>
            )}

            {sonuc.bozdurma !== null && (
              <Breakdown
                title="Bugün bozdurursanız"
                rows={[
                  { label: 'Alış fiyatıyla alacağınız', value: formatTL(sonuc.bozdurma), kind: 'plus' },
                  ...(sonuc.odenen !== null ? [{ label: 'Ödediğiniz tutar', value: formatTL(sonuc.odenen), kind: 'minus' as const }] : []),
                  ...(sonuc.fark !== null
                    ? [{ label: sonuc.fark >= 0 ? 'Fark (kâr)' : 'Fark (zarar)', value: formatTL(sonuc.fark), kind: 'total' as const }]
                    : []),
                  ...(sonuc.basabasFiyati !== null
                    ? [
                        {
                          label: 'Başabaş has alış fiyatı',
                          value: formatTL(sonuc.basabasFiyati),
                          kind: 'sub' as const,
                          hint: 'Ödediğiniz tutarı geri almak için kuyumcunun has gram alış fiyatının ulaşması gereken seviye',
                        },
                      ]
                    : []),
                ]}
              />
            )}

            <DataTable
              caption="Takı takı döküm"
              columns={[
                { key: 'ad', label: 'Takı' },
                { key: 'gram', label: 'Gram' },
                { key: 'milyem', label: 'Milyem' },
                { key: 'has', label: 'Has altın' },
                { key: 'altin', label: 'Altın değeri' },
                { key: 'odenen', label: 'Toplam' },
                { key: 'iscilik', label: 'İşçilik' },
                { key: 'oran', label: 'İşçilik %' },
                { key: 'bozdur', label: 'Bozdurma' },
              ]}
              rows={sonuc.satirlar.map((s) => ({
                ad: s.ad,
                gram: formatNumber(s.gram, 3),
                milyem: formatNumber(s.milyem, 1),
                has: g3(s.hasGram),
                altin: s.altinDegeri !== null ? formatTL(s.altinDegeri) : '–',
                odenen: s.odenen !== null ? formatTL(s.odenen) : '–',
                iscilik: s.iscilikTL !== null ? formatTL(s.iscilikTL) : '–',
                oran: s.iscilikOrani !== null ? formatPercent(s.iscilikOrani) : '–',
                bozdur: s.bozdurma !== null ? formatTL(s.bozdurma) : '–',
              }))}
              foot={
                sonuc.satirlar.length > 1
                  ? {
                      ad: 'Toplam',
                      gram: formatNumber(sonuc.gram, 3),
                      milyem: '',
                      has: g3(sonuc.hasGram),
                      altin: sonuc.altinDegeri !== null ? formatTL(sonuc.altinDegeri) : '–',
                      odenen: sonuc.odenen !== null ? formatTL(sonuc.odenen) : '–',
                      iscilik: sonuc.iscilikTL !== null ? formatTL(sonuc.iscilikTL) : '–',
                      oran: sonuc.iscilikOrani !== null ? formatPercent(sonuc.iscilikOrani) : '–',
                      bozdur: sonuc.bozdurma !== null ? formatTL(sonuc.bozdurma) : '–',
                    }
                  : undefined
              }
            />

            {esdeger.length > 0 && (
              <Details summary="Aynı saf altın başka ayarlarda kaç gram eder?">
                <DataTable
                  columns={[
                    { key: 'ayar', label: 'Ayar' },
                    { key: 'milyem', label: 'Milyem' },
                    { key: 'gram', label: `${g3(sonuc.hasGram)} saf altın` },
                  ]}
                  rows={esdeger.map((e) => ({
                    ayar: `${ayarKaydi(e.kod)?.ayar} ayar`,
                    milyem: String(e.milyem),
                    gram: g3(e.gram),
                  }))}
                />
              </Details>
            )}

            <Callout kind="info">
              Bozdururken kuyumcu, takıyı has (saf) altın değeri üzerinden alır; satın alırken ödenen işçilik çoğunlukla
              geri ödenmez. Hesaptaki “fark”, işçilik payı ile alış–satış farkının birleşik etkisini gösterir.
            </Callout>

            <ShareBar
              params={{
                mod: odenenden ? null : mod,
                birim: !odenenden && birim !== 'yuzde' ? birim : null,
                alim: alimFiyat,
                alis: bozdurmaAlis,
                kes: kesinti,
                taki: paylasimTaki,
              }}
              summary={ozet}
            />
          </>
        ) : (
          <ResultEmpty>
            {gecerli
              ? 'Sonucu görmek için en az bir takının ağırlığını (gram) ve ayarını girin.'
              : 'Sonucu görmek için kırmızı işaretli alanları düzeltin.'}
          </ResultEmpty>
        )}
      </div>
    </div>
  );
}
