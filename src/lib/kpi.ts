// Ana sayfadaki "Bu ayın rakamları" kutucukları. Değerler oran dosyalarından ve TÜFE serisinden
// site derlenirken hesaplanır; oran dosyası güncellenince kutucuklar da kendiliğinden güncellenir.
import { asgariUcretOn } from '../data/params/asgari-ucret';
import { kidemTavani, kidemTavaniOn } from '../data/params/kidem';
import { memurEmekliZam } from '../data/params/memur-emekli-zam';
import { ayEkle, tufe } from '../data/series';
import { onIkiAylikOrtalama } from '../tools/kira-artis-hesaplama/calc';
import { formatMonthTR, formatPercent, formatTL } from './format';

export interface Kpi {
  label: string;
  value: string;
  /** Kutucuğun altındaki küçük etiket (dönem) */
  tag: string;
  href: string;
  color: string;
  /** Halka grafik için 0–100 arası oran; tutar kutucuklarında yok */
  ring?: number;
}

const ayYil = (isoMonth: string) => formatMonthTR(isoMonth);
const KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
/** "2026-07" + "2026-12" → "Tem–Ara 2026" */
const kisaAralik = (a: string, b: string) =>
  a.slice(0, 4) === b.slice(0, 4)
    ? `${KISA[Number(a.slice(5, 7)) - 1]}–${KISA[Number(b.slice(5, 7)) - 1]} ${b.slice(0, 4)}`
    : `${ayYil(a)} – ${ayYil(b)}`;

export function buildKpis(today: string): Kpi[] {
  const asgari = asgariUcretOn(today);
  const sonTufe = tufe.aylar[tufe.aylar.length - 1];

  // Kira artış sınırı: yenileme ayından önceki ayın TÜFE 12 aylık ortalaması (TBK md. 344).
  // Bu ayın oranı açıklanmadıysa açıklanmış son ay gösterilir.
  let esasAy = ayEkle(today.slice(0, 7), -1);
  let kira = onIkiAylikOrtalama(esasAy);
  if (kira === null) {
    esasAy = tufe.sonAy;
    kira = onIkiAylikOrtalama(esasAy) ?? 0;
  }

  const kidemListe = kidemTavani.values.donemler;
  const kidem = kidemTavaniOn(today) ?? kidemListe[kidemListe.length - 1];
  const zam = memurEmekliZam.values.aciklanan[memurEmekliZam.values.aciklanan.length - 1];

  return [
    {
      label: 'Net asgari ücret',
      value: formatTL(asgari.net),
      tag: asgari.from.slice(0, 4),
      href: '/brut-net-maas-hesaplama/',
      color: '#3b82f6',
    },
    {
      label: 'Yıllık enflasyon (TÜFE)',
      value: formatPercent(sonTufe.yillik),
      tag: ayYil(sonTufe.ay),
      href: '/enflasyon-hesaplama/',
      color: '#14b8a6',
      ring: sonTufe.yillik,
    },
    {
      label: 'Kira artış sınırı',
      value: formatPercent(kira),
      tag: `${ayYil(ayEkle(esasAy, 1))} yenilemeleri`,
      href: '/kira-artis-hesaplama/',
      color: '#8b5cf6',
      ring: kira,
    },
    {
      label: 'Kıdem tazminatı tavanı',
      value: formatTL(kidem.tavan),
      tag: kisaAralik(kidem.from.slice(0, 7), kidem.to.slice(0, 7)),
      href: '/kidem-tazminati-hesaplama/',
      color: '#ec4899',
    },
    {
      label: `Emekli zammı · memur ${formatPercent(zam.memur)}`,
      value: formatPercent(zam.emekli),
      tag: ayYil(zam.ay),
      href: '/emekli-zammi-hesaplama/',
      color: '#f59e0b',
      ring: zam.emekli,
    },
  ];
}
