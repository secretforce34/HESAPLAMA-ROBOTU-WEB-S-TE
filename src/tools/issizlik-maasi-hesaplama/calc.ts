import { asgariUcretOn } from '../../data/params/asgari-ucret';
import { issizlikKurallari, issizlikSuresi } from '../../data/params/issizlik';
import { pekSinirlariOn } from '../../data/params/sgk-sinirlar';
import { round2 } from '../../lib/finance';

export interface IssizlikInput {
  /** Son 4 ayın brüt (prime esas) kazançları */
  son4Ay: number[];
  /** Son 3 yılda ödenen prim günü */
  primGun: number;
  /** İşten ayrılmadan önceki son 120 gün kesintisiz prim ödendi mi */
  kesintisiz120: boolean;
  /** Ayrılış nedeni ödeneğe hak kazandırıyor mu (md. 51) */
  nedenUygun: boolean;
  /** İşten ayrılış tarihi (ISO) — tavan için o dönemin asgari ücreti */
  tarih: string;
}

export interface IssizlikSonucu {
  hakVar: boolean;
  /** Hak yoksa nedenleri */
  engeller: string[];
  /** Tavana göre kırpılmış son 4 ay prime esas kazanç ortalaması */
  ortalamaPek: number;
  hesaplananAylik: number;
  tavan: number;
  tavanUygulandi: boolean;
  aylikBrut: number;
  aylikDamga: number;
  aylikNet: number;
  gunlukBrut: number;
  sureGun: number;
  sureAy: number;
  toplamNet: number;
}

/**
 * 4447 md. 50: günlük ödenek = son 4 aylık PEK'e göre günlük ortalama brüt kazancın %40'ı;
 * aylık brüt asgari ücretin %80'ini geçemez. Ödenekten damga vergisi dışında kesinti yapılmaz.
 */
export function hesaplaIssizlik(i: IssizlikInput): IssizlikSonucu {
  const k = issizlikKurallari.values;
  const asgari = asgariUcretOn(i.tarih).brut;
  const ust = pekSinirlariOn(i.tarih).aylikUst;
  const pekler = i.son4Ay.map((b) => Math.min(b, ust));
  const ortalamaPek = round2(pekler.reduce((t, b) => t + b, 0) / pekler.length);

  const hesaplananAylik = round2((ortalamaPek * k.odenekOrani) / 100);
  const tavan = round2((asgari * k.tavanOrani) / 100);
  const tavanUygulandi = hesaplananAylik > tavan;
  const aylikBrut = Math.min(hesaplananAylik, tavan);
  const aylikDamga = round2(aylikBrut * k.damgaVergisi);
  const aylikNet = round2(aylikBrut - aylikDamga);
  const gunlukBrut = round2(aylikBrut / 30);

  const sureGun = issizlikSuresi(i.primGun);
  const engeller: string[] = [];
  if (!i.nedenUygun) engeller.push('İş sözleşmesi kendi isteğinizle ya da kusurunuzla sona ermiş görünüyor.');
  if (!i.kesintisiz120) engeller.push('İşten ayrılmadan önceki son 120 gün kesintisiz prim ödenmemiş.');
  if (sureGun === 0) engeller.push('Son 3 yılda en az 600 gün prim gerekiyor.');
  const hakVar = engeller.length === 0;

  return {
    hakVar,
    engeller,
    ortalamaPek,
    hesaplananAylik,
    tavan,
    tavanUygulandi,
    aylikBrut,
    aylikDamga,
    aylikNet,
    gunlukBrut,
    sureGun: hakVar ? sureGun : 0,
    sureAy: hakVar ? sureGun / 30 : 0,
    toplamNet: hakVar ? round2((aylikNet * sureGun) / 30) : 0,
  };
}

export function validateIssizlik(i: { aylar: (number | null)[]; primGun: number | null; tarih: string }) {
  const e: Record<string, string> = {};
  if (i.aylar.some((a) => a === null || a < 0)) e.aylar = 'Son 4 ayın brüt kazancını girin.';
  if (i.primGun === null || i.primGun < 0) e.primGun = 'Prim gün sayısını girin.';
  else if (i.primGun > 1095) e.primGun = 'Son 3 yılda en fazla 1.095 gün olabilir.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tarih)) e.tarih = 'Ayrılış tarihini seçin.';
  return e;
}
