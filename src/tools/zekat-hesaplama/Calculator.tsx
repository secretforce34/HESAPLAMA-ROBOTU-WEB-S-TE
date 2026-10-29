import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { altinAyarlari, ayarEtiketi, ayarKaydi } from '../../data/params/altin';
import { fitreFidye } from '../../data/params/diyanet';
import { todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatNumber, formatTL } from '../../lib/format';
import { CheckboxField, DateField, NumberField, Segmented, SelectField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, numParam, readParams } from '../../ui/url';
import {
  fidyeTutari,
  fitreDonemiOn,
  fitreTutari,
  hesaplaZekat,
  kameriYilDurumu,
  validateVarlik,
  validateZekat,
  varlikTuruAdi,
  type VarlikTuru,
} from './calc';

const TURLER: VarlikTuru[] = ['nakit', 'doviz', 'altin', 'gumus', 'ticari-mal', 'alacak', 'hisse-ticaret', 'hisse-temettu', 'diger'];
const TUR_SECENEKLERI = TURLER.map((t) => ({ value: t, label: varlikTuruAdi(t) }));
const AYAR_SECENEKLERI = [
  ...altinAyarlari.values.ayarlar.map((a) => ({ value: a.kod, label: ayarEtiketi(a) })),
  { value: 'ozel', label: 'Özel milyem…' },
];
const DONEMLER = [...fitreFidye.values.donemler].reverse();

const TUR_IPUCU: Partial<Record<VarlikTuru, string>> = {
  nakit: 'Elinizdeki TL ile vadesiz ve vadeli hesaplardaki toplam.',
  'ticari-mal': 'Kâr amacıyla alınıp satılan malın zekât günündeki güncel değeri.',
  alacak: 'Tahsil edilmesini beklediğiniz alacaklar (borç verdiğiniz para, mal bedeli alacağı). Tahsil ihtimali olmayanları girmeyin.',
  'hisse-ticaret': 'Alıp satmak amacıyla tuttuğunuz hisselerin piyasa değeri.',
  'hisse-temettu': 'Kâr payı için tuttuğunuz hisselerde hissenin değeri değil, elde ettiğiniz kâr payı tutarı.',
  diger: 'Fon gibi Diyanet’in ayrıca açıklamadığı varlıkları kendi değerlendirmenizle buraya yazabilirsiniz.',
};

interface Satir {
  id: number;
  tur: VarlikTuru;
  tutar: number | null;
  miktar: number | null;
  kur: number | null;
  gram: number | null;
  ayarKod: string;
  ozelMilyem: number | null;
  taki: boolean;
}

const milyemOf = (s: Satir): number | null => (s.ayarKod === 'ozel' ? s.ozelMilyem : (ayarKaydi(s.ayarKod)?.milyem ?? null));

export default function Calculator() {
  const sayac = useRef(1);
  const yeni = (p: Partial<Satir> = {}): Satir => ({
    id: sayac.current++,
    tur: 'nakit',
    tutar: null,
    miktar: null,
    kur: null,
    gram: null,
    ayarKod: '22',
    ozelMilyem: null,
    taki: false,
    ...p,
  });

  const [satirlar, setSatirlar] = useState<Satir[]>(() => [yeni({ tur: 'nakit', tutar: 150000 }), yeni({ tur: 'altin', gram: 60, taki: true })]);
  const [altinFiyati, setAltinFiyati] = useState<number | null>(null);
  const [gumusFiyati, setGumusFiyati] = useState<number | null>(null);
  const [borclar, setBorclar] = useState<number | null>(null);
  const [temelIhtiyac, setTemelIhtiyac] = useState<number | null>(null);
  const [takiDahil, setTakiDahil] = useState(true);
  const [nisapTarihi, setNisapTarihi] = useState('');
  const [bugun, setBugun] = useState('');
  const [donem, setDonem] = useState(DONEMLER[0].from);
  const [kisi, setKisi] = useState<number | null>(4);
  const [fidyeGun, setFidyeGun] = useState<number | null>(null);

  useEffect(() => {
    const t = todayIsoTR();
    setBugun(t);
    setDonem(fitreDonemiOn(t).from);

    // Paylaşılan bağlantı: ?altin=4000&v=nakit:150000;altin:60:22:1;doviz:1000:40&borc=0&kisi=4
    const p = readParams();
    const a = numParam(p, 'altin');
    if (a !== null) setAltinFiyati(a);
    const g = numParam(p, 'gumus');
    if (g !== null) setGumusFiyati(g);
    const b = numParam(p, 'borc');
    if (b !== null) setBorclar(b);
    const ih = numParam(p, 'ihtiyac');
    if (ih !== null) setTemelIhtiyac(ih);
    const td = boolParam(p, 'taki');
    if (td !== null) setTakiDahil(td);
    const k = numParam(p, 'kisi');
    if (k !== null) setKisi(k);
    const fg = numParam(p, 'gun');
    if (fg !== null) setFidyeGun(fg);
    const nt = p.get('tarih');
    if (nt && /^\d{4}-\d{2}-\d{2}$/.test(nt)) setNisapTarihi(nt);
    const dn = p.get('donem');
    if (dn && DONEMLER.some((d) => d.from === dn)) setDonem(dn);

    const v = p.get('v');
    if (v) {
      const num = (x?: string) => (x && Number.isFinite(Number(x)) ? Number(x) : null);
      const list: Satir[] = [];
      for (const part of v.split(';').slice(0, 40)) {
        const [tur, f1, f2, f3, f4] = part.split(':');
        if (!(TURLER as string[]).includes(tur)) continue;
        if (tur === 'doviz') list.push(yeni({ tur, miktar: num(f1), kur: num(f2) }));
        else if (tur === 'altin') list.push(yeni({ tur, gram: num(f1), ayarKod: f2 === 'ozel' || ayarKaydi(f2) ? f2 : '22', taki: f3 === '1', ozelMilyem: num(f4) }));
        else if (tur === 'gumus') list.push(yeni({ tur, gram: num(f1), taki: f2 === '1' }));
        else list.push(yeni({ tur: tur as VarlikTuru, tutar: num(f1) }));
      }
      if (list.length > 0) setSatirlar(list);
    }
  }, []);

  const guncelle = (id: number, patch: Partial<Satir>) => setSatirlar((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const sil = (id: number) => setSatirlar((l) => (l.length > 1 ? l.filter((s) => s.id !== id) : l));

  const gumusVar = satirlar.some((s) => s.tur === 'gumus' && (s.gram ?? 0) > 0 && !(s.taki && !takiDahil));
  const hatalar = validateZekat({ altinFiyati, gumusFiyati, borclar, temelIhtiyac, gumusVar });
  const satirHatalari = satirlar.map((s) =>
    validateVarlik({ tur: s.tur, tutar: s.tutar, miktar: s.miktar, kur: s.kur, gram: s.gram, milyem: milyemOf(s) }),
  );
  const satirlarGecerli = satirHatalari.every((h) => Object.keys(h).length === 0);
  const gecerli = Object.keys(hatalar).length === 0 && satirlarGecerli;

  const sonuc = useMemo(
    () =>
      gecerli
        ? hesaplaZekat({
            varliklar: satirlar.map((s) => ({
              tur: s.tur,
              tutar: s.tutar,
              miktar: s.miktar,
              kur: s.kur,
              gram: s.gram,
              milyem: milyemOf(s),
              taki: s.taki,
            })),
            borclar: borclar ?? 0,
            temelIhtiyac: temelIhtiyac ?? 0,
            altinFiyati,
            gumusFiyati,
            takiDahil,
          })
        : null,
    [gecerli, satirlar, borclar, temelIhtiyac, altinFiyati, gumusFiyati, takiDahil],
  );

  const kameri = sonuc && nisapTarihi && bugun ? kameriYilDurumu(nisapTarihi, bugun) : null;

  const donemKaydi = DONEMLER.find((d) => d.from === donem) ?? DONEMLER[0];
  const kisiHata = kisi !== null && (Number.isNaN(kisi) || kisi < 0 || !Number.isInteger(kisi)) ? 'Kişi sayısı 0 veya tam sayı olmalı.' : undefined;
  const gunHata = fidyeGun !== null && (Number.isNaN(fidyeGun) || fidyeGun < 0 || !Number.isInteger(fidyeGun)) ? 'Gün sayısı 0 veya tam sayı olmalı.' : undefined;
  const fitre = kisi !== null && !kisiHata ? fitreTutari(kisi, donemKaydi.tutar) : null;
  const fidye = fidyeGun !== null && !gunHata ? fidyeTutari(fidyeGun, donemKaydi.tutar) : null;

  const nedenMetni = (() => {
    if (!sonuc || !sonuc.nisapNedeni) return null;
    if (sonuc.nisapNedeni === 'deger')
      return `Net varlığınız (${formatTL(sonuc.netVarlik)}), 80,18 g altının değeri olan nisabı (${formatTL(sonuc.altinNisabiDegeri ?? 0)}) aşıyor.`;
    if (sonuc.nisapNedeni === 'altin-agirlik')
      return `Altınlarınızın toplam ağırlığı (${formatNumber(sonuc.altinGram, 2)} g) 80,18 grama ulaşıyor. Diyanet’e göre altında ayar farkı önemli değildir; zekât her ayarın kendi değeri üzerinden hesaplanır.`;
    return `Gümüşünüz (${formatNumber(sonuc.gumusGram, 2)} g) 561 gram nisabına ulaşıyor. Diyanet’e göre elinde bu miktarda gümüş olan kişi zekâtını bu nisap üzerinden verir.`;
  })();

  const paylasV = satirlar
    .map((s) => {
      if (s.tur === 'doviz') return `doviz:${s.miktar ?? ''}:${s.kur ?? ''}`;
      if (s.tur === 'altin') return `altin:${s.gram ?? ''}:${s.ayarKod}:${s.taki ? 1 : 0}${s.ayarKod === 'ozel' ? `:${s.ozelMilyem ?? ''}` : ''}`;
      if (s.tur === 'gumus') return `gumus:${s.gram ?? ''}:${s.taki ? 1 : 0}`;
      return `${s.tur}:${s.tutar ?? ''}`;
    })
    .join(';');

  const ozet = [
    'Zekât hesabı (Diyanet ölçüleri)',
    ...(sonuc
      ? [
          `Zekâta tabi varlık: ${formatTL(sonuc.toplamVarlik)}`,
          `Borç ve ihtiyaç düşüldükten sonra: ${formatTL(sonuc.netVarlik)}`,
          `Nisap (80,18 g altın): ${formatTL(sonuc.altinNisabiDegeri ?? 0)}`,
          sonuc.nisabaUlasti ? `Zekât (%2,5): ${formatTL(sonuc.zekat)}` : 'Nisaba ulaşılmadı',
        ]
      : []),
    ...(fitre !== null ? [`Fitre (${donemKaydi.etiket}): ${kisi} kişi × ${formatTL(donemKaydi.tutar, 0)} = ${formatTL(fitre)}`] : []),
    'Fetva değildir.',
  ].join('\n');

  const alanlar = (s: Satir, i: number) => {
    const h = satirHatalari[i];
    switch (s.tur) {
      case 'doviz':
        return (
          <div class="line-item__fields">
            <NumberField id={`zk-miktar-${s.id}`} label="Döviz miktarı" value={s.miktar} onChange={(v) => guncelle(s.id, { miktar: v })} error={h.miktar} placeholder="ör. 1.000" />
            <NumberField id={`zk-kur-${s.id}`} label="TL kuru" value={s.kur} onChange={(v) => guncelle(s.id, { kur: v })} suffix="TL" error={h.kur} placeholder="bugünkü kur" />
          </div>
        );
      case 'altin':
        return (
          <>
            <div class="line-item__fields">
              <NumberField id={`zk-gram-${s.id}`} label="Ağırlık" value={s.gram} onChange={(v) => guncelle(s.id, { gram: v })} suffix="gram" decimals={3} error={h.gram} />
              <SelectField id={`zk-ayar-${s.id}`} label="Ayar" value={s.ayarKod} onChange={(v) => guncelle(s.id, { ayarKod: v })} options={AYAR_SECENEKLERI} />
            </div>
            {s.ayarKod === 'ozel' && (
              <NumberField id={`zk-milyem-${s.id}`} label="Milyem (binde saf altın)" value={s.ozelMilyem} onChange={(v) => guncelle(s.id, { ozelMilyem: v })} decimals={1} error={h.milyem} />
            )}
            {s.ayarKod !== 'ozel' && h.milyem && <p class="field__error">{h.milyem}</p>}
            <CheckboxField id={`zk-taki-${s.id}`} label="Takı / ziynet olarak kullanılıyor" checked={s.taki} onChange={(v) => guncelle(s.id, { taki: v })} />
          </>
        );
      case 'gumus':
        return (
          <>
            <NumberField id={`zk-gram-${s.id}`} label="Ağırlık" value={s.gram} onChange={(v) => guncelle(s.id, { gram: v })} suffix="gram" decimals={3} error={h.gram} />
            <CheckboxField id={`zk-taki-${s.id}`} label="Takı / ziynet olarak kullanılıyor" checked={s.taki} onChange={(v) => guncelle(s.id, { taki: v })} />
          </>
        );
      default:
        return (
          <NumberField
            id={`zk-tutar-${s.id}`}
            label={s.tur === 'hisse-temettu' ? 'Elde edilen kâr payı' : 'Tutar (TL)'}
            value={s.tutar}
            onChange={(v) => guncelle(s.id, { tutar: v })}
            suffix="TL"
            error={h.tutar}
            hint={TUR_IPUCU[s.tur]}
          />
        );
    }
  };

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <p class="calc-section-title">1. Altın ve gümüş fiyatı (siz yazarsınız)</p>
        <div class="row-2">
          <NumberField
            id="zk-altin-fiyat"
            label="Gram altın fiyatı (24 ayar)"
            value={altinFiyati}
            onChange={setAltinFiyati}
            suffix="TL"
            placeholder="ör. 4.000"
            error={hatalar.altinFiyati}
            hint="Nisap, 80,18 g altının değeriyle ölçülür. Site fiyat çekmez."
          />
          <NumberField
            id="zk-gumus-fiyat"
            label="Gram gümüş fiyatı"
            value={gumusFiyati}
            onChange={setGumusFiyati}
            suffix="TL"
            error={hatalar.gumusFiyati}
            hint="Yalnızca gümüşünüz varsa gerekir."
          />
        </div>

        <p class="calc-section-title">2. Varlıklarınız</p>
        <ul class="line-items">
          {satirlar.map((s, i) => (
            <li class="line-item" key={s.id}>
              <div class="line-item__head">
                <span>Varlık {i + 1}</span>
                {satirlar.length > 1 && (
                  <button type="button" class="line-item__remove" onClick={() => sil(s.id)} aria-label={`Varlık ${i + 1}’i sil`}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              <SelectField id={`zk-tur-${s.id}`} label="Tür" value={s.tur} onChange={(v) => guncelle(s.id, { tur: v })} options={TUR_SECENEKLERI} />
              {alanlar(s, i)}
            </li>
          ))}
        </ul>
        <button type="button" class="btn btn--small add-row" onClick={() => setSatirlar((l) => [...l, yeni({ tur: 'nakit' })])}>
          + Varlık ekle
        </button>

        <p class="calc-section-title">3. Borçlar ve ihtiyaçlar</p>
        <NumberField
          id="zk-borc"
          label="Bu zekât yılı içinde ödenmesi gereken borçlar"
          value={borclar}
          onChange={setBorclar}
          suffix="TL"
          error={hatalar.borclar}
          hint="Diyanet’e göre uzun vadeli kredi ve taksitlerin tamamı değil, yalnızca bu zekât yılına ait birikmiş ve vadesi bu yıl içinde dolan kısım düşülür."
        />
        <NumberField
          id="zk-ihtiyac"
          label="Temel ihtiyaçlar için ayırdığınız tutar (isteğe bağlı)"
          value={temelIhtiyac}
          onChange={setTemelIhtiyac}
          suffix="TL"
          error={hatalar.temelIhtiyac}
          hint="Barınma, geçim, ulaşım, eğitim gibi temel ihtiyaçlar için ayrılan para zekâta tabi değildir."
        />
        <Details summary="Takı altın görüşü ve zekât yılı">
          <div class="calc-inputs">
            <Segmented
              name="zk-taki"
              label="Takı / ziynet olarak kullanılan altın ve gümüş"
              value={takiDahil ? 'dahil' : 'haric'}
              onChange={(v) => setTakiDahil(v === 'dahil')}
              options={[
                { value: 'dahil', label: 'Hesaba kat (Hanefî)' },
                { value: 'haric', label: 'Hesaba katma' },
              ]}
              hint="Diyanet, Hanefî mezhebine göre altın ve gümüş ziynetin zekâta tabi olduğunu belirtir. Şâfiî, Mâlikî ve Hanbelî bilginlerine göre olağan kullanımdaki takı asli ihtiyaç sayıldığı için zekât gerekmez."
            />
            <DateField
              id="zk-nisap-tarih"
              label="Nisaba ulaştığınız tarih (isteğe bağlı)"
              value={nisapTarihi}
              onChange={setNisapTarihi}
              max={bugun || undefined}
              hint="Üzerinden bir kamerî yıl (yaklaşık 354 gün) geçince zekât farz olur; yıl dönümünü hesaplar."
            />
          </div>
        </Details>

        <p class="calc-section-title">4. Fitre ve fidye</p>
        <SelectField
          id="zk-donem"
          label="Fitre dönemi"
          value={donem}
          onChange={setDonem}
          options={DONEMLER.map((d) => ({ value: d.from, label: `${d.etiket} (${formatTL(d.tutar, 0)})` }))}
        />
        <div class="row-2">
          <NumberField
            id="zk-kisi"
            label="Fitre verilecek kişi sayısı"
            value={kisi}
            onChange={setKisi}
            decimals={0}
            inputMode="numeric"
            suffix="kişi"
            error={kisiHata}
            hint="Kendiniz ve bakmakla yükümlü olduklarınız."
          />
          <NumberField
            id="zk-fidye-gun"
            label="Fidye gün sayısı (isteğe bağlı)"
            value={fidyeGun}
            onChange={setFidyeGun}
            decimals={0}
            inputMode="numeric"
            suffix="gün"
            error={gunHata}
            hint="Oruç tutamadığınız her gün için bir fidye."
          />
        </div>
      </div>

      <div class="calc-results">
        {sonuc ? (
          <>
            {sonuc.nisabaUlasti ? (
              <ResultHero
                label="Ödenecek zekât (kırkta bir)"
                value={formatTL(sonuc.zekat)}
                sub={
                  <>
                    Net varlık {formatTL(sonuc.netVarlik)} × %2,5
                    {sonuc.zekatAltinGram !== null && <> · altın cinsinden <strong>{formatNumber(sonuc.zekatAltinGram, 3)} g</strong> (24 ayar)</>}
                  </>
                }
              />
            ) : (
              <ResultHero
                label="Net zekâta tabi varlık"
                value={formatTL(sonuc.netVarlik)}
                sub={<>Nisap değeri {formatTL(sonuc.altinNisabiDegeri ?? 0)}: bu hesaba göre nisaba ulaşılmadı</>}
              />
            )}

            {nedenMetni && <Callout kind="success">{nedenMetni}</Callout>}
            {sonuc.agirlikDegerCelisiyor && (
              <Callout kind="warning">
                Altınlarınızın ağırlığı 80,18 grama ulaşıyor, ancak borç ve ihtiyaç düşüldükten sonra değeri nisabın altında
                kalıyor. Borcun hangi varlıktan düşüleceği Diyanet’in ayrıntılı değerlendirmesine bağlıdır; 190 Diyanet Fetva
                Hattı’na danışabilirsiniz.
              </Callout>
            )}

            <Breakdown
              title="Hesabın dökümü"
              rows={[
                { label: 'Zekâta tabi varlıklar', value: formatTL(sonuc.toplamVarlik) },
                { label: 'Borçlar', value: formatTL(sonuc.borclar), kind: 'minus' },
                ...(sonuc.temelIhtiyac > 0 ? [{ label: 'Temel ihtiyaçlar için ayrılan', value: formatTL(sonuc.temelIhtiyac), kind: 'minus' as const }] : []),
                { label: 'Net zekâta tabi varlık', value: formatTL(sonuc.netVarlik), kind: 'total' },
                { label: 'Nisap (80,18 g altın değeri)', value: formatTL(sonuc.altinNisabiDegeri ?? 0), kind: 'sub' },
                ...(sonuc.nisabaUlasti ? [{ label: 'Zekât (%2,5)', value: formatTL(sonuc.zekat), kind: 'total' as const }] : []),
              ]}
            />

            {sonuc.kalemler.length > 0 && (
              <DataTable
                caption="Varlık varlık döküm"
                columns={[
                  { key: 'tur', label: 'Tür' },
                  { key: 'ayrinti', label: 'Ayrıntı' },
                  { key: 'deger', label: 'Değer' },
                ]}
                rows={sonuc.kalemler.map((k) => ({
                  tur: varlikTuruAdi(k.tur),
                  ayrinti: k.aciklama,
                  deger: k.dahil ? formatTL(k.deger) : 'Hesaba girmedi',
                }))}
                foot={{ tur: 'Toplam', ayrinti: '', deger: formatTL(sonuc.toplamVarlik) }}
              />
            )}

            <Callout kind="info">
              <strong>Kamerî yıl şartı:</strong> Zekât, nisap miktarına sahip olduktan sonra üzerinden bir kamerî yıl
              geçince farz olur; yıl başında ve sonunda nisabı koruyor olmak gerekir, yıl içindeki artış ve azalışlara
              bakılmaz.
              {kameri && (
                <>
                  {' '}
                  {formatDateTR(nisapTarihi)} tarihine göre yıl dönümü yaklaşık <strong>{formatDateTR(kameri.bitisIso)}</strong>
                  {kameri.tamamlandi ? ' (süre dolmuş görünüyor).' : ` (yaklaşık ${kameri.kalanGun} gün kaldı).`} Kesin gün için
                  Diyanet takvimine bakın.
                </>
              )}
            </Callout>
          </>
        ) : (
          <ResultEmpty>
            {hatalar.altinFiyati
              ? 'Zekât hesabı için yukarıya gram altın (24 ayar) fiyatını yazın; nisap bu fiyatla ölçülür. Fitre ve fidye aşağıda fiyatsız hesaplanır.'
              : 'Sonucu görmek için kırmızı işaretli alanları düzeltin.'}
          </ResultEmpty>
        )}

        <Breakdown
          title={`Fitre ve fidye · ${donemKaydi.etiket}`}
          rows={[
            { label: 'Kişi başı fitre (Din İşleri Yüksek Kurulu)', value: formatTL(donemKaydi.tutar, 0) },
            ...(fitre !== null && kisi !== null ? [{ label: `Toplam fitre (${kisi} kişi)`, value: formatTL(fitre), kind: 'total' as const }] : []),
            { label: 'Günlük oruç fidyesi (aynı tutar)', value: formatTL(donemKaydi.tutar, 0) },
            ...(fidye !== null && fidyeGun !== null && fidyeGun > 0 ? [{ label: `Toplam fidye (${fidyeGun} gün)`, value: formatTL(fidye), kind: 'total' as const }] : []),
          ]}
        />
        <p class="field__hint">
          Kurul, fitreyi nakit ya da gıda olarak verilebileceğini belirtir; her mükellef günlük gıda harcamasını dikkate
          alarak belirlediği tutarı fitre olarak verebilir. Fitre için zekâttaki gibi bir yıl geçmesi aranmaz; borç ve temel
          ihtiyaç dışında nisap miktarı mala sahip olmak yeterlidir.
        </p>

        <Callout kind="info">
          <strong>Bu hesap fetva değildir.</strong> Diyanet İşleri Başkanlığı’nın yayımladığı ölçülere dayanır; farklı
          görüşler ve kişisel durumlar sonucu değiştirebilir. Ayrıntılı sorular için Din İşleri Yüksek Kurulu’nun
          açıklamalarına, <strong>190 Diyanet Fetva Hattı’na (Alo 190)</strong> ya da diyk.diyanet.gov.tr adresindeki Dini
          Bilgilendirme Platformu’na başvurabilirsiniz.
        </Callout>

        <ShareBar
          params={{
            altin: altinFiyati,
            gumus: gumusFiyati,
            v: paylasV,
            borc: borclar,
            ihtiyac: temelIhtiyac,
            taki: takiDahil ? null : false,
            tarih: nisapTarihi || null,
            donem: donem === DONEMLER[0].from ? null : donem,
            kisi,
            gun: fidyeGun,
          }}
          summary={ozet}
        />
      </div>
    </div>
  );
}
