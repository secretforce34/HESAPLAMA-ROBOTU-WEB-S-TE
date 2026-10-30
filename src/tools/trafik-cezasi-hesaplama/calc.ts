import { trafikCezasiOdeme } from '../../data/params/trafik-cezasi';
import { round2 } from '../../lib/finance';

export type TebligSekli = 'elden' | 'posta' | 'etebligat';

// ---------- tarih yardımcıları (ISO yyyy-mm-dd, UTC) ----------
const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function gunEkle(tarih: string, gun: number): string {
  return iso(utc(tarih) + gun * 86_400_000);
}

/** Ay ekler; hedef ayda o gün yoksa ayın son günü (31 Ocak + 1 ay = 28/29 Şubat). */
export function ayEkle(tarih: string, ay: number): string {
  const y = Number(tarih.slice(0, 4));
  const m = Number(tarih.slice(5, 7)) - 1 + ay;
  const d = Number(tarih.slice(8, 10));
  const sonGun = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return iso(Date.UTC(y, m, Math.min(d, sonGun)));
}

/** Tebliğ tarihi: elden ve postada belgedeki tarih; e-tebligatta adrese ulaştığı günü izleyen 5. gün. */
export function tebligTarihi(tarih: string, sekil: TebligSekli): string {
  return sekil === 'etebligat' ? gunEkle(tarih, trafikCezasiOdeme.values.eTebligatGun) : tarih;
}

/** Son ödeme gününden sonra geçen ay sayısı; ay kesri tam ay sayılır. */
export function gecikmeAyi(sonOdeme: string, odeme: string): number {
  if (odeme <= sonOdeme) return 0;
  let n = 1;
  while (ayEkle(sonOdeme, n) < odeme) n++;
  return n;
}

export interface CezaInput {
  tutar: number;
  /** Tutanağın elden verildiği / postayla tebliğ edildiği / e-tebligat adresine ulaştığı gün */
  tarih: string;
  sekil: TebligSekli;
  odemeTarihi: string;
}

export interface CezaSonucu {
  teblig: string;
  /** İndirimli ödemenin ve normal ödeme süresinin son günü */
  sonOdeme: string;
  itirazSonGun: string;
  indirimli: boolean;
  indirimliTutar: number;
  indirim: number;
  gecikmeAy: number;
  faiz: number;
  /** Faiz üst sınıra (cezanın iki katı) takıldı mı */
  sinirda: boolean;
  odenecek: number;
}

export function hesaplaCeza(i: CezaInput): CezaSonucu {
  const p = trafikCezasiOdeme.values;
  const teblig = tebligTarihi(i.tarih, i.sekil);
  const sonOdeme = ayEkle(teblig, p.odemeSuresiAy);
  const indirimliTutar = round2((i.tutar * (100 - p.indirimYuzde)) / 100);
  const indirimli = i.odemeTarihi <= sonOdeme;
  const gecikmeAy = gecikmeAyi(sonOdeme, i.odemeTarihi);
  const hamFaiz = round2((i.tutar * p.aylikFaizYuzde * gecikmeAy) / 100);
  const azamiFaiz = round2(i.tutar * (p.ustSinirKat - 1));
  const faiz = Math.min(hamFaiz, azamiFaiz);
  return {
    teblig,
    sonOdeme,
    itirazSonGun: gunEkle(teblig, p.itirazGun),
    indirimli,
    indirimliTutar,
    indirim: indirimli ? round2(i.tutar - indirimliTutar) : 0,
    gecikmeAy,
    faiz,
    sinirda: hamFaiz > azamiFaiz,
    odenecek: indirimli ? indirimliTutar : round2(i.tutar + faiz),
  };
}

export function validateCeza(i: { tutar: number | null; tarih: string }, odemeTarihi: string): string | null {
  if (i.tutar === null || i.tutar <= 0) return 'Ceza tutarını girin.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tarih)) return 'Tebliğ tarihini seçin.';
  if (i.tarih > odemeTarihi) return 'Tebliğ tarihi ödeme tarihinden sonra olamaz.';
  return null;
}
