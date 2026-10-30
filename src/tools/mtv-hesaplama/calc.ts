import { mtvTarifesi, type YasTutarlari } from '../../data/params/mtv';

export type AracTuru = 'otomobil' | 'motosiklet';

export const YAS_GRUPLARI = ['1–3 yaş', '4–6 yaş', '7–11 yaş', '12–15 yaş', '16 ve üstü'] as const;
const YAS_UST = [3, 6, 11, 15, Infinity];

/** Tescil belgesindeki model yılında taşıt 1 yaşındadır (197 s. Kanun md. 11). */
export function aracYasi(modelYili: number, vergiYili: number): number {
  return Math.max(1, vergiYili - modelYili + 1);
}

export function yasGrubu(yas: number): number {
  return YAS_UST.findIndex((u) => yas <= u);
}

const ustteMi = (deger: number, ust: number | null) => ust === null || deger <= ust;

/** Otomobil satırı: benzinli/dizelde silindir hacmine, elektrikli araçta motor gücüne göre. */
export function otomobilSatiri(olcu: number, elektrikli: boolean): number {
  const list = mtvTarifesi.values.otomobil;
  const i = list.findIndex((s) => ustteMi(olcu, elektrikli ? s.ustKw : s.ustCc));
  return i === -1 ? list.length - 1 : i;
}

/** Motosiklet satırı; tarifenin altında kalan (100 cm³ altı / 6 kW ve altı) motosiklet vergi dışıdır → -1 */
export function motosikletSatiri(olcu: number, elektrikli: boolean): number {
  const list = mtvTarifesi.values.motosiklet;
  const alt = elektrikli ? list[0].altKw : list[0].altCc;
  if (elektrikli ? olcu <= alt : olcu < alt) return -1;
  const i = list.findIndex((s) => ustteMi(olcu, elektrikli ? s.ustKw : s.ustCc));
  return i === -1 ? list.length - 1 : i;
}

export interface MtvInput {
  tur: AracTuru;
  elektrikli: boolean;
  /** Silindir hacmi (cm³) ya da elektrikli araçta motor gücü (kW) */
  olcu: number;
  modelYili: number;
  /** 1.1.2018 ve sonrası tescil → (I) sayılı tarife; öncesi → (I/A) */
  yeniTescil: boolean;
  /** (I) sayılı tarifede taşıt değeri kademesi (0 = en düşük) */
  kademe: number;
}

export interface KademeSecenegi {
  ad: string;
  yillik: number;
}

export interface MtvSonucu {
  yas: number;
  yasGrubu: number;
  /** Tarifenin uygulandığı satırın açıklaması */
  satir: string;
  yillik: number;
  taksit: number;
  /** Elektrikli indirimi uygulanmadan önceki tutar */
  tamTutar: number;
  vergiDisi: boolean;
  /** (I) sayılı tarifede tüm değer kademeleri için yıllık tutar */
  kademeler: KademeSecenegi[];
  /** Bir sonraki yaş grubuna geçilecek yıl ve bugünkü tarifeyle o gruptaki tutar */
  sonrakiGrup: { yil: number; yillik: number } | null;
}

const tl = (n: number) => n.toLocaleString('tr-TR');

function kademeAdi(alt: number | null, ust: number | null): string {
  if (alt === null && ust === null) return 'Tek kademe';
  if (alt === null) return `${tl(ust!)} TL’ye kadar`;
  if (ust === null) return `${tl(alt)} TL üstü`;
  return `${tl(alt)} – ${tl(ust)} TL`;
}

export function hesaplaMtv(i: MtvInput): MtvSonucu {
  const p = mtvTarifesi.values;
  const yas = aracYasi(i.modelYili, p.yil);
  const g = yasGrubu(yas);
  const oran = i.elektrikli ? p.elektrikliOran / 100 : 1;
  const birim = i.elektrikli ? 'kW' : 'cm³';
  const yuvarla = (n: number) => Math.round(n * oran * 100) / 100;

  let tutarlar: YasTutarlari | null = null;
  let satir = '';
  let kademeler: KademeSecenegi[] = [];

  if (i.tur === 'motosiklet') {
    const s = motosikletSatiri(i.olcu, i.elektrikli);
    if (s >= 0) {
      const m = p.motosiklet[s];
      tutarlar = m.tutar;
      const alt = s === 0 ? (i.elektrikli ? m.altKw : m.altCc) : i.elektrikli ? p.motosiklet[s - 1].ustKw : p.motosiklet[s - 1].ustCc;
      const ust = i.elektrikli ? m.ustKw : m.ustCc;
      satir = `Motosiklet ${ust === null ? `${alt} ${birim} üstü` : `${alt}–${ust} ${birim}`}`;
    }
  } else {
    const s = otomobilSatiri(i.olcu, i.elektrikli);
    const o = p.otomobil[s];
    const onceki = s > 0 ? p.otomobil[s - 1] : null;
    const alt = onceki ? (i.elektrikli ? onceki.ustKw : onceki.ustCc) : null;
    const ust = i.elektrikli ? o.ustKw : o.ustCc;
    // cm³ tam sayıdır (1301–1600); kW’da kanun “geçen fakat geçmeyen” der (70–85 kW, alt sınır hariç)
    const aralik = alt === null ? `${ust} ${birim} ve altı` : ust === null ? `${alt} ${birim} üstü` : `${i.elektrikli ? alt : alt + 1}–${ust} ${birim}`;
    if (i.yeniTescil) {
      const k = Math.min(Math.max(0, i.kademe), o.kademeler.length - 1);
      tutarlar = o.kademeler[k].tutar;
      kademeler = o.kademeler.map((x, j) => ({ ad: kademeAdi(j === 0 ? null : o.kademeler[j - 1].ustDeger, x.ustDeger), yillik: yuvarla(x.tutar[g]) }));
      satir = `Otomobil ${aralik}, (I) sayılı tarife`;
    } else {
      tutarlar = o.eski;
      satir = `Otomobil ${aralik}, (I/A) sayılı tarife`;
    }
  }

  if (!tutarlar) {
    return { yas, yasGrubu: g, satir: 'Tarife dışı', yillik: 0, taksit: 0, tamTutar: 0, vergiDisi: true, kademeler: [], sonrakiGrup: null };
  }
  const yillik = yuvarla(tutarlar[g]);
  const sonrakiGrup = g < YAS_UST.length - 1 ? { yil: i.modelYili + YAS_UST[g], yillik: yuvarla(tutarlar[g + 1]) } : null;
  return { yas, yasGrubu: g, satir, yillik, taksit: Math.round((yillik / 2) * 100) / 100, tamTutar: tutarlar[g], vergiDisi: false, kademeler, sonrakiGrup };
}

export function validateMtv(i: { olcu: number | null; modelYili: number | null }, vergiYili = mtvTarifesi.values.yil) {
  const e: Record<string, string> = {};
  if (i.olcu === null || i.olcu <= 0) e.olcu = 'Değeri girin.';
  if (i.modelYili === null || !Number.isInteger(i.modelYili) || i.modelYili < 1950 || i.modelYili > vergiYili + 1) e.modelYili = `1950 ile ${vergiYili + 1} arasında bir yıl girin.`;
  return e;
}
