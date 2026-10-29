import type { ParamSet } from './types';

/**
 * Serbest meslek makbuzu (SMM) hesabında kullanılan yasal değerler.
 * Bu dosya ayrıca senet/çek iskontosunda kullanılan BSMV oranını da taşır.
 */

// ---------- Gelir vergisi stopajı ----------

export const serbestMeslekStopaji: ParamSet<{
  /** GVK md. 94/2-b: serbest meslek ödemelerinde genel kesinti oranı (%) */
  genelOran: number;
  /** GVK md. 94/2-a: GVK md. 18 kapsamındaki serbest meslek işleri (telif, patent, yazılım, çeviri, resim, fotoğraf vb.) (%) */
  md18Oran: number;
}> = {
  id: 'serbest-meslek-stopaj',
  title: 'Serbest meslek ödemelerinde gelir vergisi stopajı',
  validFrom: '2025-01-01',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    genelOran: 20,
    md18Oran: 17,
  },
  sources: [
    {
      label: 'GİB – Gelir Vergisi Kanununun 94. maddesinde yer alan kesinti oranları (md. 94/2-a: %17, md. 94/2-b: %20)',
      url: 'https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-kanununun-94uncu-maddesinde-yer-alan-kesinti-oranlari.pdf',
    },
    {
      label: 'GİB – 2026 Serbest Meslek Kazancı Elde Eden Mükellefler İçin Vergi Rehberi (bölüm 6: serbest meslek kazançlarında vergi tevkifatı)',
      url: 'https://cdn.gib.gov.tr/api/gibportal-file/file/getFile?objectKey=DUYURU%2FUNIVERSAL%2F2026%2F2026_Serbest_Meslek_Kazanci.pdf',
    },
  ],
  note: 'Cumhurbaşkanı, GVK md. 94 uyarınca bu oranları değiştirebilir. Kesinti bir ön vergidir; yıllık beyannamede hesaplanan vergiden mahsup edilir.',
};

// ---------- KDV tevkifatı (serbest meslek hizmetlerinde karşılaşılanlar) ----------

/**
 * Hizmeti alan tarafın KDV tevkifatı bakımından türü (KDV GUT I/C-2.1.3.1):
 *  tuketici    – KDV mükellefi olmayan alıcı (bireysel müşteri, apartman yönetimi vb.)
 *  mukellef    – KDV mükellefi (I/C-2.1.3.1/a): şirket, işletme; belirlenmiş alıcı değil
 *  kamu        – kamu idare ve kurumları, KİT'ler, döner sermayeli kuruluşlar, kamu kurumu niteliğindeki
 *                meslek kuruluşları, bankalar, sigorta/reasürans/emeklilik şirketleri, emekli ve yardım
 *                sandıkları, kalkınma ajansları (belirlenmiş alıcı, I/C-2.1.3.1/b)
 *  belirlenmis – diğer belirlenmiş alıcılar (I/C-2.1.3.1/b): BİST'te işlem gören şirketler, vakıf üniversiteleri,
 *                sendikalar, mobil operatörler, borsalar, OSB'ler, özelleştirme kapsamındaki kuruluşlar vb.
 */
export type SmmAliciTuru = 'tuketici' | 'mukellef' | 'kamu' | 'belirlenmis';

export interface SmmTevkifatKurali {
  /** 9 → 9/10 */
  pay: number;
  ad: string;
  /** Kapsamın kısa anlatımı */
  kapsam: string;
  /** KDV GUT bölümü */
  bolum: string;
  /** Bu oranın uygulandığı alıcı türleri */
  alicilar: SmmAliciTuru[];
  /** Alıcı grubunun sade anlatımı ("… hizmet alanlara karşı uygulanır") */
  aliciMetni: string;
}

export const smmKdvTevkifati: ParamSet<{
  kurallar: SmmTevkifatKurali[];
  /**
   * (I/C-2.1.3.2.1) KDV mükellefi alıcılara (belirlenmiş alıcı olmayanlara) karşı yapım işlerinde 4/10 tevkifat,
   * yalnızca KDV dahil bedel bu tutar ve üzerindeyse uygulanır (TL).
   */
  yapimIsiMukellefAltSiniri: number;
}> = {
  id: 'smm-kdv-tevkifati',
  title: 'Serbest meslek hizmetlerinde KDV tevkifatı',
  validFrom: '2021-03-01',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    kurallar: [
      {
        pay: 9,
        ad: 'Etüt, plan-proje, danışmanlık, denetim ve benzeri hizmetler',
        kapsam:
          'Piyasa etüt-araştırma, ekspertiz, plan-proje; teknik, ekonomik, mali ve hukuki danışmanlık, müşavirlik, denetim; yapım işinden bağımsız mimarlık, mühendislik, harita, imar planı; avukatların danışmanlık hizmeti. Avukatın dava, icra gibi vekâlet hizmetleri kapsam dışıdır.',
        bolum: 'I/C-2.1.3.2.2',
        alicilar: ['kamu', 'belirlenmis'],
        aliciMetni: 'belirlenmiş alıcılara (kamu kurumları, bankalar, sigorta şirketleri, borsada işlem gören şirketler vb.)',
      },
      {
        pay: 5,
        ad: 'Tebliğde ayrıca belirlenmeyen diğer hizmetler',
        kapsam:
          'KDV GUT’de özel olarak sayılmayan diğer bütün hizmet ifaları. Faturası SGK’ya düzenlenen sağlık hizmetleri kapsam dışıdır.',
        bolum: 'I/C-2.1.3.2.13',
        alicilar: ['kamu'],
        aliciMetni: 'kamu idare ve kurumlarına, bankalara, sigorta şirketlerine ve benzeri kamu nitelikli alıcılara',
      },
      {
        pay: 4,
        ad: 'Yapım işleriyle birlikte ifa edilen mühendislik-mimarlık ve etüt-proje hizmetleri',
        kapsam:
          'Yapım işiyle birlikte verilen mühendislik-mimarlık, etüt-proje hizmetleri. Belirlenmiş alıcılara her tutarda; KDV mükellefi alıcılara KDV dahil 5 milyon TL ve üzerinde.',
        bolum: 'I/C-2.1.3.2.1',
        alicilar: ['kamu', 'belirlenmis'],
        aliciMetni: 'belirlenmiş alıcılara (her tutarda) ve KDV mükellefi alıcılara (KDV dahil 5 milyon TL ve üzerinde)',
      },
      {
        pay: 3,
        ad: 'Ticari reklam hizmetleri',
        kapsam:
          'Reklam danışmanlığı, reklamın planlanması, içeriğinin hazırlanması ve tasarımı, yayımlanması gibi ticari reklama yönelik hizmetler.',
        bolum: 'I/C-2.1.3.2.15',
        alicilar: ['mukellef', 'kamu', 'belirlenmis'],
        aliciMetni: 'KDV mükellefi alıcılara ve belirlenmiş alıcılara',
      },
    ],
    yapimIsiMukellefAltSiniri: 5_000_000,
  },
  sources: [
    {
      label: 'KDV Genel Uygulama Tebliği (GİB güncel derleme) – I/C-2.1.3 Kısmi Tevkifat Uygulaması',
      url: 'https://cdn.gib.gov.tr/api/gibportal-file/file/getFile?objectKey=MEVZUAT_TEBLIGLER%2FUNIVERSAL%2F2026%2Fkdv_genteb.pdf',
    },
    {
      label: 'KDV Genel Uygulama Tebliği – Mevzuat Bilgi Sistemi',
      url: 'https://www.mevzuat.gov.tr/anasayfa/MevzuatFihristDetayIframe?MevzuatTur=9&MevzuatNo=19631&MevzuatTertip=5',
    },
  ],
  note: 'Kısmi tevkifat (2/10–9/10) ayrıca KDV dahil işlem bedeli VUK md. 232 fatura düzenleme sınırını aşarsa uygulanır; bu sınır kdv.ts içindeki kismi-tevkifat-siniri setinden alınır.',
};

export function smmTevkifatKurali(pay: number): SmmTevkifatKurali | undefined {
  return smmKdvTevkifati.values.kurallar.find((k) => k.pay === pay);
}

// ---------- BSMV (senet / çek iskontosu) ----------

export const bsmvOranlari: ParamSet<{
  /** Karar ile ayrıca belirlenmeyen banka muamelelerinde (ticari iskonto ve krediler dahil) BSMV oranı (%) */
  genelOran: number;
  /** Tüketici kredilerinde BSMV oranı (%) – bilgi amaçlı */
  tuketiciKredisiOrani: number;
}> = {
  id: 'bsmv-oranlari',
  title: 'Banka ve Sigorta Muameleleri Vergisi (BSMV) oranları',
  validFrom: '2023-07-07',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    genelOran: 5,
    tuketiciKredisiOrani: 15,
  },
  sources: [
    {
      label: '6802 sayılı Gider Vergileri Kanunu (md. 28 konu, md. 33 nispet ve Cumhurbaşkanı’nın oranı belirleme yetkisi)',
      url: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.3.6802.pdf',
    },
    {
      label: 'Gider Vergileri Genel Tebliği Seri No: 89 (Resmî Gazete 19.01.2012) – 98/11591 sayılı karar uyarınca genel nispet %5',
      url: 'https://www.resmigazete.gov.tr/eskiler/2012/01/20120119-15.htm',
    },
    {
      label: 'Resmî Gazete 07.07.2023 – 7345 sayılı Cumhurbaşkanı Kararı (tüketici kredilerinde %15)',
      url: 'https://www.resmigazete.gov.tr/eskiler/2023/07/20230707.htm',
    },
  ],
  note: 'BSMV bankanın iskonto (faiz) gelirinden alınır. Uygulanan oran işlem türüne göre değişebilir; bankanızın dekontundaki oranı elle yazabilirsiniz.',
};
