import { useEffect, useMemo, useState } from 'preact/hooks';
import { asgariUcretOn } from '../../data/params/asgari-ucret';
import { hazineDestegiOn, MAAS_YILLARI, maasYili } from '../../data/params/maas';
import { pekSinirlariOn } from '../../data/params/sgk-sinirlar';
import { todayIsoTR } from '../../lib/finance';
import { formatNumber, formatPercent, formatTL, monthName } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField } from '../../ui/fields';
import {
  Breakdown,
  Callout,
  DataTable,
  Details,
  ResultEmpty,
  ResultHero,
  StackedBar,
  StatGrid,
  type BreakdownRow,
} from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import {
  hesaplaBordro,
  nettenBrute,
  validateAylar,
  validateTutar,
  type AyBordrosu,
  type BordroToplam,
  type EngellilikDerecesi,
  type Tesvik,
} from './calc';

type Yon = 'brut' | 'net';
type Calisan = 'normal' | 'emekli';
type Engel = '0' | '1' | '2' | '3';

const YILLAR = MAAS_YILLARI.map(String);
const AYLAR = Array.from({ length: 12 }, (_, i) => monthName(i));
/** Tabloda "TL" yazmadan, iki ondalıklı */
const n2 = (n: number) => formatNumber(n, 2, 2);

/** Hazine desteği puanını etikete çevirir; yıl içinde değiştiyse "5→4" gösterir. */
function destekEtiketi(yil: string, tur: 'genel' | 'imalat'): string {
  const ocak = hazineDestegiOn(`${yil}-01-15`)[tur];
  const aralik = hazineDestegiOn(`${yil}-12-15`)[tur];
  return ocak === aralik ? `${aralik} puan` : `${ocak}→${aralik} puan`;
}

export default function Calculator() {
  const [yon, setYon] = useState<Yon>('brut');
  const [yil, setYil] = useState<string>(YILLAR[YILLAR.length - 1]);
  const [tutar, setTutar] = useState<number | null>(50000);
  const [ayAyri, setAyAyri] = useState(false);
  const [aylar, setAylar] = useState<(number | null)[]>(() => Array(12).fill(50000));
  const [calisan, setCalisan] = useState<Calisan>('normal');
  const [engel, setEngel] = useState<Engel>('0');
  const [tesvik, setTesvik] = useState<Tesvik>('genel');
  const [devir, setDevir] = useState(true);
  const [secAy, setSecAy] = useState(0);

  useEffect(() => {
    // Varsayılan: bu yıl ve bu ay (sayfa sunucuda derlendiği için tarayıcıda belirlenir).
    const bugun = todayIsoTR();
    if (YILLAR.includes(bugun.slice(0, 4))) {
      setYil(bugun.slice(0, 4));
      setSecAy(Number(bugun.slice(5, 7)) - 1);
    }
    // Paylaşılan bağlantı: ?yon=brut&yil=2026&tutar=50000 ya da &aylar=50000,…(12 değer)&emekli=1&engel=2&tesvik=imalat&devir=0&ay=10
    const p = readParams();
    const y = enumParam(p, 'yon', ['brut', 'net'] as const);
    if (y) setYon(y);
    const yl = numParam(p, 'yil');
    if (yl !== null && YILLAR.includes(String(yl))) setYil(String(yl));
    const t = numParam(p, 'tutar');
    if (t !== null && t >= 0) setTutar(t);
    const a = p.get('aylar');
    if (a) {
      const list = a.split(',').map((x) => Number(x));
      if (list.length === 12 && list.every((x) => Number.isFinite(x) && x >= 0)) {
        setAylar(list);
        setAyAyri(true);
      }
    }
    if (boolParam(p, 'emekli') === true) setCalisan('emekli');
    const e = enumParam(p, 'engel', ['1', '2', '3'] as const);
    if (e) setEngel(e);
    const tv = enumParam(p, 'tesvik', ['yok', 'genel', 'imalat'] as const);
    if (tv) setTesvik(tv);
    if (boolParam(p, 'devir') === false) setDevir(false);
    const ay = numParam(p, 'ay');
    if (ay !== null && ay >= 1 && ay <= 12) setSecAy(ay - 1);
  }, []);

  const ayAyriDegistir = (v: boolean) => {
    if (v) setAylar(Array(12).fill(tutar));
    setAyAyri(v);
  };
  const ayGuncelle = (i: number, v: number | null) => setAylar((list) => list.map((x, j) => (j === i ? v : x)));

  const yilNo = Number(yil);
  const p = maasYili(yilNo);
  const emekli = calisan === 'emekli';
  const asgariBrut = asgariUcretOn(`${yil}-06-15`).brut;
  const pekUst = pekSinirlariOn(`${yil}-06-15`).aylikUst;
  const tutarAdi = yon === 'brut' ? 'Brüt ücret' : 'Net ücret';

  const tekHata = ayAyri
    ? undefined
    : (validateTutar(tutar, tutarAdi) ?? (tutar === 0 ? 'Sıfırdan büyük bir tutar girin.' : undefined));
  const ayHatalari = ayAyri ? validateAylar(aylar) : {};
  const gecerli = !tekHata && Object.keys(ayHatalari).length === 0;
  const degerler = (ayAyri ? aylar : Array(12).fill(tutar)) as number[];
  const degerAnahtari = degerler.join(',');

  const bordro = useMemo(() => {
    if (!gecerli) return null;
    const s = { yil: yilNo, emekli, engellilik: Number(engel) as EngellilikDerecesi, tesvik, sgkDevir: devir };
    return yon === 'brut' ? hesaplaBordro(degerler, s) : nettenBrute(degerler, s);
    // degerler her çizimde yeni dizi olduğundan bağımlılıkta içeriğini temsil eden degerAnahtari kullanılır
  }, [gecerli, yon, degerAnahtari, yilNo, emekli, engel, tesvik, devir]);

  const tesvikSecenekleri: { value: Tesvik; label: string }[] = [
    { value: 'yok', label: 'Yok' },
    { value: 'genel', label: `Genel (${destekEtiketi(yil, 'genel')})` },
    { value: 'imalat', label: `İmalat (${destekEtiketi(yil, 'imalat')})` },
  ];

  return (
    <>
      <div class="calc-grid">
        <div class="calc-inputs">
          <Segmented
            name="bn-yon"
            label="Hesap yönü"
            value={yon}
            onChange={setYon}
            options={[
              { value: 'brut', label: 'Brütten nete' },
              { value: 'net', label: 'Netten brüte' },
            ]}
            hint={
              yon === 'net'
                ? 'Her ay elinize geçmesini istediğiniz neti yazın; gereken brüt her ay ayrı bulunur.'
                : undefined
            }
          />

          {!ayAyri && (
            <NumberField
              id="bn-tutar"
              label={yon === 'brut' ? 'Aylık brüt ücret' : 'Aylık net ücret'}
              value={tutar}
              onChange={setTutar}
              suffix="TL"
              placeholder="ör. 50.000"
              error={tekHata}
              hint={`${yil} brüt asgari ücret: ${formatTL(asgariBrut)}`}
            />
          )}

          <CheckboxField
            id="bn-ay-ayri"
            label="Ay ay farklı tutar gireceğim"
            checked={ayAyri}
            onChange={ayAyriDegistir}
            hint="İkramiye, prim, zam ayı ya da yıl ortasında işe başlama için. Çalışmadığınız aylara 0 yazın."
          />

          {ayAyri && (
            <div class="field">
              <span class="field__label">{yon === 'brut' ? 'Aylık brüt tutarlar' : 'Aylık net tutarlar'}</span>
              <div class="row-2">
                {AYLAR.map((ad, i) => (
                  <NumberField
                    key={ad}
                    id={`bn-ay-${i + 1}`}
                    label={ad}
                    value={aylar[i]}
                    onChange={(v) => ayGuncelle(i, v)}
                    suffix="TL"
                    error={ayHatalari[i]}
                  />
                ))}
              </div>
            </div>
          )}

          <div class="row-2">
            <SelectField
              id="bn-yil"
              label="Yıl"
              value={yil}
              onChange={setYil}
              options={YILLAR.map((y) => ({ value: y, label: y }))}
            />
            <SelectField
              id="bn-engel"
              label="Engellilik indirimi"
              value={engel}
              onChange={setEngel}
              options={[
                { value: '0', label: 'Yok' },
                { value: '1', label: `1. derece (${formatTL(p.engellilikIndirimi[0], 0)})` },
                { value: '2', label: `2. derece (${formatTL(p.engellilikIndirimi[1], 0)})` },
                { value: '3', label: `3. derece (${formatTL(p.engellilikIndirimi[2], 0)})` },
              ]}
            />
          </div>

          <Segmented
            name="bn-calisan"
            label="Çalışan"
            value={calisan}
            onChange={setCalisan}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'emekli', label: 'Emekli (SGDP)' },
            ]}
            hint={
              emekli
                ? 'Emekli aylığı alırken çalışanlardan %7,5 sosyal güvenlik destek primi kesilir, işsizlik primi kesilmez.'
                : undefined
            }
          />

          <Segmented
            name="bn-tesvik"
            label="İşveren Hazine prim desteği"
            value={tesvik}
            onChange={setTesvik}
            options={tesvikSecenekleri}
            hint={
              emekli
                ? 'Destek, emekli (SGDP’li) çalışanlarda uygulanmaz.'
                : 'Primlerini zamanında ödeyen, SGK’ya borcu olmayan özel sektör işverenleri yararlanır (5510 md. 81/1-ı). Net maaşı değiştirmez, yalnızca işveren maliyetini etkiler.'
            }
          />

          <Details summary="Gelişmiş: SGK tavanı ve ikramiye devri">
            <CheckboxField
              id="bn-devir"
              label="Tavanı aşan ikramiye/primi izleyen 2 aya devret"
              checked={devir}
              onChange={setDevir}
              hint={`5510 md. 80: ücret dışı ödemelerin ${formatTL(pekUst)} tavanını aştığı ay prime tabi tutulamayan kısmı, sonraki en fazla iki ayın boş kalan tavanına eklenir. Aylar farklı tutarlıysa etkilidir.`}
            />
          </Details>
        </div>

        <div class="calc-results">
          {bordro ? (
            <Sonuclar
              aylar={bordro.aylar}
              toplam={bordro.toplam}
              yon={yon}
              yil={yil}
              secAy={secAy}
              setSecAy={setSecAy}
              emekli={emekli}
              asgariBrut={asgariBrut}
              pekUst={pekUst}
              paylas={{
                yon,
                yil,
                tutar: ayAyri ? null : tutar,
                aylar: ayAyri ? aylar.map((x) => x ?? 0).join(',') : null,
                emekli: emekli ? true : null,
                engel: engel === '0' ? null : engel,
                tesvik: tesvik === 'genel' ? null : tesvik,
                devir: devir ? null : false,
                ay: secAy + 1,
              }}
            />
          ) : (
            <ResultEmpty>Sonucu görmek için geçerli bir aylık tutar girin.</ResultEmpty>
          )}
        </div>
      </div>

      {bordro && (
        <div class="calc-wide">
          <DataTable
            caption={`${yil} yılı 12 aylık bordro tablosu (TL)`}
            columns={[
              { key: 'ay', label: 'Ay' },
              { key: 'brut', label: 'Brüt' },
              { key: 'sgk', label: emekli ? 'SGDP işçi' : 'SGK işçi' },
              { key: 'iss', label: 'İşsizlik işçi' },
              { key: 'matrah', label: 'GV matrahı' },
              { key: 'kum', label: 'Kümülatif matrah' },
              { key: 'dilim', label: 'Dilim' },
              { key: 'gvh', label: 'Hesaplanan GV' },
              { key: 'gvi', label: 'GV istisnası' },
              { key: 'gv', label: 'Ödenecek GV' },
              { key: 'dvh', label: 'Damga vergisi' },
              { key: 'dvi', label: 'DV istisnası' },
              { key: 'dv', label: 'Ödenecek DV' },
              { key: 'net', label: 'Net' },
              { key: 'isgk', label: emekli ? 'İşveren SGDP' : 'İşveren SGK' },
              { key: 'iiss', label: 'İşveren işsizlik' },
              { key: 'maliyet', label: 'Toplam maliyet' },
            ]}
            rows={bordro.aylar.map((a) => ({
              ay: AYLAR[a.ay - 1],
              brut: n2(a.brut),
              sgk: n2(a.sgkIsci),
              iss: n2(a.issizlikIsci),
              matrah: n2(a.gvMatrahi),
              kum: n2(a.kumulatifMatrah),
              dilim: a.brut > 0 ? formatPercent(a.dilim) : '–',
              gvh: n2(a.gvHesaplanan),
              gvi: n2(a.gvIstisna),
              gv: n2(a.gvOdenecek),
              dvh: n2(a.dvHesaplanan),
              dvi: n2(a.dvIstisna),
              dv: n2(a.dvOdenecek),
              net: <strong>{n2(a.net)}</strong>,
              isgk: n2(a.sgkIsveren),
              iiss: n2(a.issizlikIsveren),
              maliyet: n2(a.maliyet),
            }))}
            foot={{
              ay: 'Yıllık',
              brut: n2(bordro.toplam.brut),
              sgk: n2(bordro.toplam.sgkIsci),
              iss: n2(bordro.toplam.issizlikIsci),
              matrah: n2(bordro.toplam.gvMatrahi),
              kum: '',
              dilim: '',
              gvh: n2(bordro.toplam.gvHesaplanan),
              gvi: n2(bordro.toplam.gvIstisna),
              gv: n2(bordro.toplam.gvOdenecek),
              dvh: n2(bordro.toplam.dvHesaplanan),
              dvi: n2(bordro.toplam.dvIstisna),
              dv: n2(bordro.toplam.dvOdenecek),
              net: n2(bordro.toplam.net),
              isgk: n2(bordro.toplam.sgkIsveren),
              iiss: n2(bordro.toplam.issizlikIsveren),
              maliyet: n2(bordro.toplam.maliyet),
            }}
          />
          <p class="field__hint">
            Tablo yatay kayar. Gelir vergisi her ay yılbaşından o aya kadarki kümülatif matraha göre hesaplanır; asgari ücret
            istisnası, asgari ücretin o ayki vergisini aşamaz (GVK md. 23/18).
          </p>
        </div>
      )}
    </>
  );
}

interface SonucProps {
  aylar: AyBordrosu[];
  toplam: BordroToplam;
  yon: Yon;
  yil: string;
  secAy: number;
  setSecAy: (n: number) => void;
  emekli: boolean;
  asgariBrut: number;
  pekUst: number;
  paylas: Record<string, string | number | boolean | null>;
}

function Sonuclar({ aylar, toplam, yon, yil, secAy, setSecAy, emekli, asgariBrut, pekUst, paylas }: SonucProps) {
  const a = aylar[secAy];
  const calisilan = aylar.filter((x) => x.brut > 0);
  const netler = calisilan.map((x) => x.net);
  const brutler = calisilan.map((x) => x.brut);
  const minNet = Math.min(...netler);
  const maxNet = Math.max(...netler);
  const minBrut = Math.min(...brutler);
  const maxBrut = Math.max(...brutler);
  const ortNet = toplam.net / Math.max(1, calisilan.length);

  // Dilim geçişleri: kümülatif matrahın üst dilime girdiği aylar
  const gecisler = aylar.filter((x, i) => i > 0 && x.brut > 0 && x.dilim > aylar[i - 1].dilim && aylar[i - 1].brut > 0);
  const tavanAyi = aylar.some((x) => x.tavanAsimi > 0);
  const devirVar = aylar.some((x) => x.devirKullanilan > 0);
  const asgariAlti = aylar.some((x) => x.brut > 0 && x.brut < asgariBrut);

  const primIpucu =
    a.devirKullanilan > 0
      ? `Önceki aylardan devreden ${formatTL(a.devirKullanilan)} dahil`
      : a.sgkMatrahi < a.brut
        ? `Prime esas kazanç tavanla sınırlı: ${formatTL(a.sgkMatrahi)}`
        : undefined;

  const calisanSatirlari: BreakdownRow[] = [
    { label: 'Brüt ücret', value: formatTL(a.brut) },
    {
      label: emekli ? 'SGDP işçi payı (%7,5)' : 'SGK işçi payı (%14)',
      value: formatTL(a.sgkIsci),
      kind: 'minus',
      hint: primIpucu,
    },
    ...(emekli
      ? []
      : [{ label: 'İşsizlik sigortası işçi payı (%1)', value: formatTL(a.issizlikIsci), kind: 'minus' as const }]),
    ...(a.engellilikIndirimi > 0
      ? [
          {
            label: 'Engellilik indirimi',
            value: formatTL(a.engellilikIndirimi),
            kind: 'sub' as const,
            hint: 'Yalnızca gelir vergisi matrahından düşülür.',
          },
        ]
      : []),
    {
      label: 'Gelir vergisi matrahı',
      value: formatTL(a.gvMatrahi),
      kind: 'sub',
      hint: `Yıl içi kümülatif ${formatTL(a.kumulatifMatrah)} · dilim ${formatPercent(a.dilim)}`,
    },
    { label: 'Hesaplanan gelir vergisi', value: formatTL(a.gvHesaplanan), kind: 'sub' },
    { label: 'Asgari ücret istisnası', value: `−${formatTL(a.gvIstisna)}`, kind: 'sub' },
    { label: 'Gelir vergisi', value: formatTL(a.gvOdenecek), kind: 'minus' },
    {
      label: 'Damga vergisi',
      value: formatTL(a.dvOdenecek),
      kind: 'minus',
      hint: `Binde 7,59 = ${formatTL(a.dvHesaplanan)}; asgari ücrete düşen ${formatTL(a.dvIstisna)} istisna`,
    },
    { label: 'Net ücret', value: formatTL(a.net), kind: 'total' },
  ];

  const isverenSatirlari: BreakdownRow[] = [
    { label: 'Brüt ücret', value: formatTL(a.brut) },
    {
      label: `${emekli ? 'SGDP işveren payı' : 'SGK işveren payı'} (${formatPercent(a.sgkIsverenOrani)})`,
      value: formatTL(a.sgkIsveren),
      kind: 'plus',
      hint: a.hazineIndirimi > 0 ? `Hazine desteği ${formatTL(a.hazineIndirimi)} düşüldü` : undefined,
    },
    ...(emekli
      ? []
      : [{ label: 'İşsizlik sigortası işveren payı (%2)', value: formatTL(a.issizlikIsveren), kind: 'plus' as const }]),
    { label: 'İşverene toplam maliyet', value: formatTL(a.maliyet), kind: 'total' },
  ];

  const ozet = [
    `${yil} – ${yon === 'brut' ? 'brütten nete' : 'netten brüte'} maaş hesabı${emekli ? ' (emekli, SGDP)' : ''}`,
    ...aylar.map((x) => `${AYLAR[x.ay - 1]}: brüt ${formatTL(x.brut)} → net ${formatTL(x.net)}`),
    `Yıllık brüt: ${formatTL(toplam.brut)}`,
    `Yıllık net: ${formatTL(toplam.net)}`,
    `İşverene yıllık maliyet: ${formatTL(toplam.maliyet)}`,
  ].join('\n');

  return (
    <>
      {yon === 'brut' ? (
        <ResultHero
          label={`${AYLAR[secAy]} ${yil} net maaş`}
          value={formatTL(a.net)}
          sub={
            minNet !== maxNet ? (
              <>
                Yıl içinde <strong>{formatTL(minNet)}</strong> – <strong>{formatTL(maxNet)}</strong> · ortalama{' '}
                {formatTL(ortNet)}
              </>
            ) : (
              <>
                Her ay aynı · yıllık net <strong>{formatTL(toplam.net)}</strong>
              </>
            )
          }
        />
      ) : (
        <ResultHero
          label={`${AYLAR[secAy]} ${yil} için gereken brüt`}
          value={formatTL(a.brut)}
          sub={
            minBrut !== maxBrut ? (
              <>
                Aynı net için yıl içinde <strong>{formatTL(minBrut)}</strong> – <strong>{formatTL(maxBrut)}</strong> brüt
                gerekir
              </>
            ) : (
              <>Her ay aynı brüt yeterli</>
            )
          }
        />
      )}

      <SelectField
        id="bn-dokum-ay"
        label="Dökümü gösterilen ay"
        value={String(secAy)}
        onChange={(v) => setSecAy(Number(v))}
        options={AYLAR.map((ad, i) => ({ value: String(i), label: `${ad} ${yil}` }))}
      />

      <Breakdown title={`Çalışan: ${AYLAR[secAy]} bordrosu`} rows={calisanSatirlari} />
      <Breakdown title="İşverene maliyet" rows={isverenSatirlari} />

      <StackedBar
        label="İşverene maliyetin dağılımı"
        parts={[
          { label: 'Net ücret', value: a.net, display: formatTL(a.net) },
          { label: 'İşçi primleri', value: a.sgkIsci + a.issizlikIsci, display: formatTL(a.sgkIsci + a.issizlikIsci) },
          { label: 'Gelir vergisi', value: a.gvOdenecek, display: formatTL(a.gvOdenecek) },
          { label: 'Damga vergisi', value: a.dvOdenecek, display: formatTL(a.dvOdenecek) },
          {
            label: 'İşveren primleri',
            value: a.sgkIsveren + a.issizlikIsveren,
            display: formatTL(a.sgkIsveren + a.issizlikIsveren),
          },
        ]}
      />

      <StatGrid
        items={[
          { label: 'Yıllık brüt', value: formatTL(toplam.brut, 0) },
          { label: 'Yıllık net', value: formatTL(toplam.net, 0) },
          { label: 'Yıllık gelir vergisi', value: formatTL(toplam.gvOdenecek, 0) },
          { label: 'İşverene yıllık maliyet', value: formatTL(toplam.maliyet, 0) },
        ]}
      />

      {gecisler.length > 0 && (
        <Callout kind="info">
          <strong>Net maaş yıl içinde değişiyor.</strong> Gelir vergisi yılbaşından itibaren biriken (kümülatif) matraha göre
          hesaplanır; matrahınız{' '}
          {gecisler.map((x) => `${AYLAR[x.ay - 1]} ayında %${x.dilim}`).join(', ')} dilimine geçtiği için o aydan sonra
          kesinti artar.
        </Callout>
      )}

      {tavanAyi && (
        <Callout kind="info">
          Brüt ücret SGK tavanını ({formatTL(pekUst)}) aştığı aylarda SGK ve işsizlik primleri tavan üzerinden kesilir;
          aşan kısım yalnızca vergilere tabidir.
          {devirVar && ' İkramiye gibi ücret dışı ödemelerin aşan kısmı izleyen ayların boş tavanına devredildi.'}
        </Callout>
      )}

      {asgariAlti && (
        <Callout kind="warning">
          Bazı aylarda brüt tutar {yil} brüt asgari ücretinin ({formatTL(asgariBrut)}) altında. Tam ay çalışan işçinin
          ücreti bundan az olamaz; kısmi çalışmada SGK prim günü ayrıca dikkate alınır, bu hesapta alınmadı.
        </Callout>
      )}

      {emekli && (
        <Callout kind="info">
          Emekli çalışanda sosyal güvenlik destek primi (%7,5 işçi, %24,75 işveren) kesilir; işsizlik primi yoktur. Asgari
          ücret istisnası tutarı değişmez (GV Genel Tebliği 319, md. 5/3).
        </Callout>
      )}

      <ShareBar params={paylas} summary={ozet} />
    </>
  );
}
