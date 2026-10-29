import { fitreDonemiOn, zekatNisap } from '../../data/params/diyanet';
import { daysBetween, round2, roundTo } from '../../lib/finance';

// Bu hesap Diyanet İşleri Başkanlığı'nın zekât yayınlarına dayanır; fetva değildir.
// Kaynaklar src/data/params/diyanet.ts içindedir.

export type VarlikTuru =
  | 'nakit'
  | 'doviz'
  | 'altin'
  | 'gumus'
  | 'ticari-mal'
  | 'alacak'
  | 'hisse-ticaret'
  | 'hisse-temettu'
  | 'diger';

export interface VarlikGirdisi {
  tur: VarlikTuru;
  /** nakit, ticari-mal, alacak, hisse-ticaret, hisse-temettu, diger → TL */
  tutar?: number | null;
  /** doviz: yabancı para miktarı × kur (TL) */
  miktar?: number | null;
  kur?: number | null;
  /** altin, gumus: brüt gram */
  gram?: number | null;
  /** altin: binde saf altın oranı (916, 750 …) */
  milyem?: number | null;
  /** altin, gumus: takı / ziynet olarak kullanılıyor */
  taki?: boolean;
}

export interface ZekatInput {
  varliklar: VarlikGirdisi[];
  /** Zekât yılı içinde ödenmesi gereken borçlar (TL) */
  borclar: number;
  /** Temel ihtiyaçlar için ayrılan nakit (TL) */
  temelIhtiyac: number;
  /** 24 ayar (has) altının gram fiyatı: nisap bu fiyatla ölçülür */
  altinFiyati: number | null;
  gumusFiyati: number | null;
  /** Takı olarak kullanılan altın ve gümüş de hesaba katılsın mı? Hanefî görüşe göre evet (Diyanet'in esas aldığı). */
  takiDahil: boolean;
}

export interface KalemSonucu {
  tur: VarlikTuru;
  /** Zekât hesabına giren TL değeri (dahil değilse 0) */
  deger: number;
  /** Varlığın zekât hesabında sayılıp sayılmadığı */
  dahil: boolean;
  /** Ekranda gösterilecek ayrıntı; hesaba girmediyse nedeni */
  aciklama: string;
}

export type NisapNedeni = 'deger' | 'altin-agirlik' | 'gumus-agirlik';

export interface ZekatSonucu {
  kalemler: KalemSonucu[];
  /** Zekâta tabi varlıkların toplam TL değeri */
  toplamVarlik: number;
  borclar: number;
  temelIhtiyac: number;
  /** Toplam − borç − temel ihtiyaç (en az 0) */
  netVarlik: number;
  /** 80,18 g × altın fiyatı */
  altinNisabiDegeri: number | null;
  /** 561 g × gümüş fiyatı */
  gumusNisabiDegeri: number | null;
  /** Hesaba giren altının brüt gramı (ayar fark etmeksizin) */
  altinGram: number;
  gumusGram: number;
  nisabaUlasti: boolean;
  nisapNedeni: NisapNedeni | null;
  /** Altın ağırlığı nisabı geçiyor ama borç/ihtiyaç düşülünce değer altında kalıyor */
  agirlikDegerCelisiyor: boolean;
  /** Ödenecek zekât (TL) */
  zekat: number;
  /** Zekâtın 24 ayar altın cinsinden gram karşılığı */
  zekatAltinGram: number | null;
}

const sayi = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);
const pozitif = (n: number | null | undefined): n is number => sayi(n) && n > 0;

const TUR_ADI: Record<VarlikTuru, string> = {
  nakit: 'Nakit / mevduat',
  doviz: 'Döviz',
  altin: 'Altın',
  gumus: 'Gümüş',
  'ticari-mal': 'Ticari mal',
  alacak: 'Alacak',
  'hisse-ticaret': 'Hisse (alım-satım amaçlı)',
  'hisse-temettu': 'Hisse (kâr payı)',
  diger: 'Diğer zekâta tabi varlık',
};
export const varlikTuruAdi = (t: VarlikTuru) => TUR_ADI[t];

/**
 * Zekât hesabı (Diyanet İşleri Başkanlığı):
 * - Altın, gümüş, para, döviz ve ticaret malları birleştirilir; borçlar ve temel ihtiyaçlar düşülür.
 * - Nisap: 80,18 g (24 ayar) altın değeri. Altında ayar farkı önemli değildir: farklı ayarlardaki altınların toplam
 *   ağırlığı 80,18 grama ulaşırsa nisap oluşur, ancak zekât her ayarın kendi değeri üzerinden hesaplanır (Zekât SSS md. 10).
 * - Gümüşte 561 g: bu miktara ulaşan gümüş sahibi zekâtını bu nisap üzerinden verir.
 * - Oran kırkta bir (%2,5); üzerinden bir kamerî yıl geçmesi gerekir (tarih ayrıca hesaplanır).
 * - Hisse: alım-satım amaçlıysa ticaret malı gibi piyasa değeriyle; kâr payı amaçlıysa yalnızca elde edilen kâr payı.
 * Ağırlık ölçüsü (altın/gümüş gramı) yalnızca borç ve temel ihtiyaç düşülmediği durumda tek başına nisap sayılır;
 * aksi halde hangi varlıktan düşüleceği net olmadığı için değer ölçüsü esas alınır.
 */
export function hesaplaZekat(input: ZekatInput): ZekatSonucu {
  const altinFiyat = pozitif(input.altinFiyati) ? input.altinFiyati : null;
  const gumusFiyat = pozitif(input.gumusFiyati) ? input.gumusFiyati : null;

  const kalemler: KalemSonucu[] = [];
  let altinGram = 0;
  let gumusGram = 0;

  for (const v of input.varliklar) {
    const dahilDegil = (aciklama: string): KalemSonucu => ({ tur: v.tur, deger: 0, dahil: false, aciklama });
    switch (v.tur) {
      case 'altin': {
        if (!pozitif(v.gram)) break;
        const milyem = pozitif(v.milyem) ? v.milyem : 0;
        if (v.taki && !input.takiDahil) {
          kalemler.push(dahilDegil(`${v.gram} g takı altın: seçtiğiniz görüşte zekâta dahil edilmez`));
          break;
        }
        altinGram += v.gram;
        const deger = altinFiyat !== null ? round2((v.gram * milyem * altinFiyat) / 1000) : 0;
        kalemler.push({ tur: v.tur, deger, dahil: true, aciklama: `${roundTo(v.gram, 3)} g, ${milyem} milyem (${roundTo((v.gram * milyem) / 1000, 3)} g has)` });
        break;
      }
      case 'gumus': {
        if (!pozitif(v.gram)) break;
        if (v.taki && !input.takiDahil) {
          kalemler.push(dahilDegil(`${v.gram} g takı gümüş: seçtiğiniz görüşte zekâta dahil edilmez`));
          break;
        }
        gumusGram += v.gram;
        const deger = gumusFiyat !== null ? round2(v.gram * gumusFiyat) : 0;
        kalemler.push({ tur: v.tur, deger, dahil: true, aciklama: `${roundTo(v.gram, 3)} g gümüş` });
        break;
      }
      case 'doviz': {
        if (!pozitif(v.miktar) || !pozitif(v.kur)) break;
        kalemler.push({ tur: v.tur, deger: round2(v.miktar * v.kur), dahil: true, aciklama: `${v.miktar} × ${v.kur} TL` });
        break;
      }
      default: {
        if (!pozitif(v.tutar)) break;
        kalemler.push({
          tur: v.tur,
          deger: round2(v.tutar),
          dahil: true,
          aciklama:
            v.tur === 'hisse-temettu'
              ? 'Elde edilen kâr payı'
              : v.tur === 'hisse-ticaret'
                ? 'Piyasa değeri'
                : v.tur === 'ticari-mal'
                  ? 'Güncel değeri'
                  : '',
        });
      }
    }
  }

  const toplamVarlik = round2(kalemler.reduce((t, k) => t + k.deger, 0));
  const borclar = Math.max(0, input.borclar);
  const temelIhtiyac = Math.max(0, input.temelIhtiyac);
  const netVarlik = round2(Math.max(0, toplamVarlik - borclar - temelIhtiyac));

  const { altinNisabiGram, gumusNisabiGram, oran } = zekatNisap.values;
  const altinNisabiDegeri = altinFiyat !== null ? round2(altinNisabiGram * altinFiyat) : null;
  const gumusNisabiDegeri = gumusFiyat !== null ? round2(gumusNisabiGram * gumusFiyat) : null;

  const kesintisiz = borclar === 0 && temelIhtiyac === 0;
  let nisapNedeni: NisapNedeni | null = null;
  if (altinNisabiDegeri !== null && netVarlik > 0 && netVarlik >= altinNisabiDegeri) nisapNedeni = 'deger';
  else if (kesintisiz && netVarlik > 0 && altinGram >= altinNisabiGram) nisapNedeni = 'altin-agirlik';
  else if (kesintisiz && netVarlik > 0 && gumusGram >= gumusNisabiGram) nisapNedeni = 'gumus-agirlik';

  const agirlikDegerCelisiyor = nisapNedeni === null && !kesintisiz && altinGram >= altinNisabiGram && netVarlik > 0;
  const nisabaUlasti = nisapNedeni !== null;
  const zekat = nisabaUlasti ? round2((netVarlik * oran) / 100) : 0;

  return {
    kalemler,
    toplamVarlik,
    borclar: round2(borclar),
    temelIhtiyac: round2(temelIhtiyac),
    netVarlik,
    altinNisabiDegeri,
    gumusNisabiDegeri,
    altinGram: roundTo(altinGram, 4),
    gumusGram: roundTo(gumusGram, 4),
    nisabaUlasti,
    nisapNedeni,
    agirlikDegerCelisiyor,
    zekat,
    zekatAltinGram: nisabaUlasti && altinFiyat !== null ? roundTo(zekat / altinFiyat, 3) : null,
  };
}

// ---------- Kamerî yıl ----------

function addDaysIso(iso: string, days: number): string {
  const t = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export interface KameriYilDurumu {
  /** Yaklaşık yıl dönümü (başlangıç + 354 gün) */
  bitisIso: string;
  /** Bugünden yıl dönümüne kalan gün (yıl dolduysa 0 ya da negatif) */
  kalanGun: number;
  tamamlandi: boolean;
}

/**
 * Nisaba ulaşılan tarihten bir kamerî (hicrî) yıl sonrası. Kamerî yıl 354 ya da 355 gündür;
 * burada 354 alınır, kesin gün için Diyanet takvimine bakılmalıdır.
 */
export function kameriYilDurumu(baslangicIso: string, bugunIso: string): KameriYilDurumu {
  const bitisIso = addDaysIso(baslangicIso, zekatNisap.values.kameriYilGun);
  const kalanGun = daysBetween(bugunIso, bitisIso);
  return { bitisIso, kalanGun, tamamlandi: kalanGun <= 0 };
}

// ---------- Fitre ve fidye ----------

/** Fitre: kişi sayısı × Din İşleri Yüksek Kurulu'nun belirlediği kişi başı tutar. */
export function fitreTutari(kisi: number, birimTutar: number): number {
  return round2(Math.max(0, kisi) * birimTutar);
}

/** Oruç fidyesi: gün sayısı × günlük fidye (fitre tutarıyla aynıdır). */
export function fidyeTutari(gun: number, birimTutar: number): number {
  return round2(Math.max(0, gun) * birimTutar);
}

export { fitreDonemiOn };

// ---------- Doğrulama ----------

export interface ZekatHatalari {
  altinFiyati?: string;
  gumusFiyati?: string;
  borclar?: string;
  temelIhtiyac?: string;
}

export function validateZekat(v: {
  altinFiyati: number | null;
  gumusFiyati: number | null;
  borclar: number | null;
  temelIhtiyac: number | null;
  gumusVar: boolean;
}): ZekatHatalari {
  const e: ZekatHatalari = {};
  if (v.altinFiyati === null || Number.isNaN(v.altinFiyati)) e.altinFiyati = 'Nisap altın değerine göre ölçülür: 24 ayar gram altın fiyatını girin.';
  else if (v.altinFiyati <= 0) e.altinFiyati = 'Fiyat sıfırdan büyük olmalı.';
  if (v.gumusFiyati !== null && (Number.isNaN(v.gumusFiyati) || v.gumusFiyati <= 0)) e.gumusFiyati = 'Fiyat sıfırdan büyük olmalı.';
  else if (v.gumusVar && v.gumusFiyati === null) e.gumusFiyati = 'Gümüşünüzün değerini hesaplamak için gram fiyatını girin.';
  if (v.borclar !== null && (Number.isNaN(v.borclar) || v.borclar < 0)) e.borclar = 'Borç negatif olamaz.';
  if (v.temelIhtiyac !== null && (Number.isNaN(v.temelIhtiyac) || v.temelIhtiyac < 0)) e.temelIhtiyac = 'Tutar negatif olamaz.';
  return e;
}

export interface VarlikHatalari {
  tutar?: string;
  miktar?: string;
  kur?: string;
  gram?: string;
  milyem?: string;
}

/** Boş alanlar hata sayılmaz (satır yok sayılır); yazılmış ama geçersiz değerler hatadır. */
export function validateVarlik(v: VarlikGirdisi): VarlikHatalari {
  const e: VarlikHatalari = {};
  const negatif = (n: number | null | undefined) => n !== null && n !== undefined && (Number.isNaN(n) || n < 0);
  if (v.tur === 'doviz') {
    if (negatif(v.miktar)) e.miktar = 'Miktar negatif olamaz.';
    if (negatif(v.kur)) e.kur = 'Kur negatif olamaz.';
  } else if (v.tur === 'altin' || v.tur === 'gumus') {
    if (negatif(v.gram)) e.gram = 'Ağırlık negatif olamaz.';
    if (v.tur === 'altin' && sayi(v.gram) && v.gram > 0) {
      if (!sayi(v.milyem) || v.milyem <= 0 || v.milyem > 1000) e.milyem = 'Milyem 1 ile 1000 arasında olmalı.';
    }
  } else if (negatif(v.tutar)) {
    e.tutar = 'Tutar negatif olamaz.';
  }
  return e;
}
