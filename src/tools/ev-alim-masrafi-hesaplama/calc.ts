import { evAlimMasraflari } from '../../data/params/ev-alim';
import { round2 } from '../../lib/finance';

export interface EkMasraf {
  ad: string;
  tutar: number;
}

export interface EvAlimInput {
  /** Tapuda beyan edilecek satış bedeli */
  satisBedeli: number;
  /** Satıcının tapu harcı payını da alıcı mı ödüyor */
  saticiHarciniDaOde: boolean;
  donerSermaye: number;
  /** Emlakçı komisyonu (alıcı payı, %; KDV hariç). 0 = emlakçı yok */
  emlakciYuzde: number;
  /** Müteahhitten alımda fiyata eklenecek KDV (%); 0 = yok / fiyata dahil */
  kdvYuzde: number;
  /** Kullanılacak konut kredisi tutarı (0 = kredi yok) */
  krediTutari: number;
  /** Kredi tahsis ücreti (binde) */
  tahsisBinde: number;
  ekspertiz: number;
  /** Zorunlu deprem sigortası (DASK) yıllık prim */
  dask: number;
  digerler: EkMasraf[];
}

export interface MasrafKalemi {
  ad: string;
  tutar: number;
  aciklama?: string;
}

export interface EvAlimSonucu {
  kalemler: MasrafKalemi[];
  toplamMasraf: number;
  /** Satış bedeli + KDV + masraflar */
  toplamMaliyet: number;
  masrafOrani: number;
  /** Peşin ödenecek: toplam maliyet − kredi */
  pesinGereken: number;
}

export function hesaplaEvAlim(i: EvAlimInput): EvAlimSonucu {
  const p = evAlimMasraflari.values;
  const kalemler: MasrafKalemi[] = [];
  const harcPayi = round2((i.satisBedeli * p.tapuHarciYuzde) / 100);
  kalemler.push({
    ad: i.saticiHarciniDaOde ? 'Tapu harcı (alıcı + satıcı payı)' : 'Tapu harcı (alıcı payı)',
    tutar: i.saticiHarciniDaOde ? round2(harcPayi * 2) : harcPayi,
    aciklama: `Satış bedelinin %${p.tapuHarciYuzde}${i.saticiHarciniDaOde ? ' + %2' : ''}`,
  });
  if (i.donerSermaye > 0) kalemler.push({ ad: 'Tapu döner sermaye ücreti', tutar: round2(i.donerSermaye) });
  if (i.kdvYuzde > 0) kalemler.push({ ad: `KDV (%${i.kdvYuzde})`, tutar: round2((i.satisBedeli * i.kdvYuzde) / 100), aciklama: 'Müteahhitten yeni konut alımında' });
  if (i.emlakciYuzde > 0) {
    const komisyon = round2((i.satisBedeli * i.emlakciYuzde) / 100);
    const kdv = round2((komisyon * p.emlakciKdv) / 100);
    kalemler.push({ ad: `Emlakçı hizmet bedeli (%${i.emlakciYuzde} + KDV)`, tutar: round2(komisyon + kdv), aciklama: `${komisyon.toLocaleString('tr-TR')} TL + %${p.emlakciKdv} KDV` });
  }
  if (i.krediTutari > 0) {
    if (i.tahsisBinde > 0) kalemler.push({ ad: `Kredi tahsis ücreti (binde ${i.tahsisBinde})`, tutar: round2((i.krediTutari * i.tahsisBinde) / 1000) });
    if (i.ekspertiz > 0) kalemler.push({ ad: 'Ekspertiz (değerleme) ücreti', tutar: round2(i.ekspertiz) });
  }
  if (i.dask > 0) kalemler.push({ ad: 'DASK (zorunlu deprem sigortası, yıllık)', tutar: round2(i.dask) });
  for (const d of i.digerler) if (d.tutar > 0) kalemler.push({ ad: d.ad || 'Diğer', tutar: round2(d.tutar) });

  const toplamMasraf = round2(kalemler.filter((k) => !k.ad.startsWith('KDV')).reduce((t, k) => t + k.tutar, 0));
  const kdv = kalemler.find((k) => k.ad.startsWith('KDV'))?.tutar ?? 0;
  const toplamMaliyet = round2(i.satisBedeli + kdv + toplamMasraf);
  return {
    kalemler,
    toplamMasraf,
    toplamMaliyet,
    masrafOrani: i.satisBedeli > 0 ? (toplamMasraf / i.satisBedeli) * 100 : 0,
    pesinGereken: round2(Math.max(0, toplamMaliyet - i.krediTutari)),
  };
}

export function validateEvAlim(i: { bedel: number | null; emlakci: number | null; kredi: number | null }) {
  const e: Record<string, string> = {};
  if (i.bedel === null || i.bedel <= 0) e.bedel = 'Satış bedelini girin.';
  if (i.emlakci !== null && (i.emlakci < 0 || i.emlakci > evAlimMasraflari.values.emlakciToplamUstSinir))
    e.emlakci = `Hizmet bedeli toplamda %${evAlimMasraflari.values.emlakciToplamUstSinir}’ü geçemez.`;
  if (i.kredi !== null && i.bedel !== null && i.kredi > i.bedel) e.kredi = 'Kredi tutarı satış bedelini geçemez.';
  return e;
}
