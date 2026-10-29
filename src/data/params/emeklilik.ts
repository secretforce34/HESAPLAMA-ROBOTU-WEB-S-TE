import type { ParamSet } from './types';

/** 08.09.1999 ve öncesi sigortalılar (506 s. Kanun geçici 81/B; 7438 s. Kanun ile yaş şartı kaldırıldı — EYT) */
export interface EytSatiri {
  /** Sigorta başlangıcı bu tarih ve sonrası … */
  from: string;
  /** … bu tarih ve öncesi */
  to: string;
  /** Gereken sigortalılık süresi (yıl) */
  sure: number;
  /** Gereken prim günü */
  gun: number;
}

export interface YasKademesi {
  /** Gün şartının bu tarih aralığında tamamlanması halinde */
  from: string;
  to: string;
  kadin: number;
  erkek: number;
}

export const emeklilikKurallari: ParamSet<{
  eytErkek: EytSatiri[];
  eytKadin: EytSatiri[];
  /** 4/b EYT: kadın 20, erkek 25 tam yıl prim (gün) */
  eytBagkur: { kadin: number; erkek: number };
  /** 09.09.1999–30.04.2008: kadın 58 / erkek 60 yaş */
  donem2: { kadinYas: number; erkekYas: number; ssk: number; bagkur: number; sskKismiSure: number; sskKismiGun: number };
  /** 01.05.2008 sonrası: gün şartının tamamlandığı tarihe göre yaş (5510 md. 28) */
  yasTablosu: YasKademesi[];
  /** 01.05.2008 sonrası tam emeklilik gün şartı */
  donem3: { ssk: number; bagkur: number };
  /** 01.05.2008 sonrası yaştan (kısmi) emeklilik: 58/60’a 3 yıl eklenmiş yaş tablosu */
  kismiYasTablosu: YasKademesi[];
  /** 5400 gün şartının başlangıç yılına göre kademesi */
  kismiGunKademesi: { from: string; to: string; gun: number }[];
  /**
   * 4/c memurlar: 01.10.2008’den önce göreve başlayanlar 5434 sayılı Kanun’a, sonrakiler 5510’a tabidir.
   * Hizmet yılı gün olarak girilir (1 yıl = 360 gün).
   */
  memur: {
    /** 5434’e tabi son başlangıç tarihi (dahil) */
    son5434: string;
    /** EYT: 08.09.1999 ve öncesi — kadın 20, erkek 25 fiili hizmet yılı, yaş yok (5434 geçici 205, 7438) */
    eyt: { kadin: number; erkek: number };
    /** 09.09.1999–30.09.2008: 25 fiili hizmet yılı, kadın 58 / erkek 60 yaş (5434 md. 39/b) */
    donem2Gun: number;
    /** 5434 md. 39: 15 yıl hizmet + 61 yaş */
    donem2KismiGun: number;
    donem2KismiYas: number;
    /** 01.10.2008 sonrası: 9000 gün + kademeli yaş; yaştan emeklilik 5400 gün (5510 md. 28) */
    donem3Gun: number;
    kismiGun: number;
  };
}> = {
  id: 'emeklilik-kurallari',
  title: 'Yaşlılık aylığı (emeklilik) şartları – 4/a, 4/b ve 4/c',
  validFrom: '2023-03-03',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    eytErkek: [
      { from: '1900-01-01', to: '1976-09-08', sure: 25, gun: 5000 },
      { from: '1976-09-09', to: '1979-05-23', sure: 25, gun: 5000 },
      { from: '1979-05-24', to: '1980-11-23', sure: 25, gun: 5000 },
      { from: '1980-11-24', to: '1982-05-23', sure: 25, gun: 5075 },
      { from: '1982-05-24', to: '1983-11-23', sure: 25, gun: 5150 },
      { from: '1983-11-24', to: '1985-05-23', sure: 25, gun: 5225 },
      { from: '1985-05-24', to: '1986-11-23', sure: 25, gun: 5300 },
      { from: '1986-11-24', to: '1988-05-23', sure: 25, gun: 5375 },
      { from: '1988-05-24', to: '1989-11-23', sure: 25, gun: 5450 },
      { from: '1989-11-24', to: '1991-05-23', sure: 25, gun: 5525 },
      { from: '1991-05-24', to: '1992-11-23', sure: 25, gun: 5600 },
      { from: '1992-11-24', to: '1994-05-23', sure: 25, gun: 5675 },
      { from: '1994-05-24', to: '1995-11-23', sure: 25, gun: 5750 },
      { from: '1995-11-24', to: '1997-05-23', sure: 25, gun: 5825 },
      { from: '1997-05-24', to: '1998-11-23', sure: 25, gun: 5900 },
      { from: '1998-11-24', to: '1999-09-08', sure: 25, gun: 5975 },
    ],
    eytKadin: [
      { from: '1900-01-01', to: '1984-05-23', sure: 20, gun: 5000 },
      { from: '1984-05-24', to: '1985-05-23', sure: 20, gun: 5000 },
      { from: '1985-05-24', to: '1986-05-23', sure: 20, gun: 5075 },
      { from: '1986-05-24', to: '1987-05-23', sure: 20, gun: 5150 },
      { from: '1987-05-24', to: '1988-05-23', sure: 20, gun: 5225 },
      { from: '1988-05-24', to: '1989-05-23', sure: 20, gun: 5300 },
      { from: '1989-05-24', to: '1990-05-23', sure: 20, gun: 5375 },
      { from: '1990-05-24', to: '1991-05-23', sure: 20, gun: 5450 },
      { from: '1991-05-24', to: '1992-05-23', sure: 20, gun: 5525 },
      { from: '1992-05-24', to: '1993-05-23', sure: 20, gun: 5600 },
      { from: '1993-05-24', to: '1994-05-23', sure: 20, gun: 5675 },
      { from: '1994-05-24', to: '1995-05-23', sure: 20, gun: 5750 },
      { from: '1995-05-24', to: '1996-05-23', sure: 20, gun: 5825 },
      { from: '1996-05-24', to: '1997-05-23', sure: 20, gun: 5900 },
      { from: '1997-05-24', to: '1999-09-08', sure: 20, gun: 5975 },
    ],
    eytBagkur: { kadin: 7200, erkek: 9000 },
    donem2: { kadinYas: 58, erkekYas: 60, ssk: 7000, bagkur: 9000, sskKismiSure: 25, sskKismiGun: 4500 },
    yasTablosu: [
      { from: '2008-05-01', to: '2035-12-31', kadin: 58, erkek: 60 },
      { from: '2036-01-01', to: '2037-12-31', kadin: 59, erkek: 61 },
      { from: '2038-01-01', to: '2039-12-31', kadin: 60, erkek: 62 },
      { from: '2040-01-01', to: '2041-12-31', kadin: 61, erkek: 63 },
      { from: '2042-01-01', to: '2043-12-31', kadin: 62, erkek: 64 },
      { from: '2044-01-01', to: '2045-12-31', kadin: 63, erkek: 65 },
      { from: '2046-01-01', to: '2047-12-31', kadin: 64, erkek: 65 },
      { from: '2048-01-01', to: '2999-12-31', kadin: 65, erkek: 65 },
    ],
    donem3: { ssk: 7200, bagkur: 9000 },
    kismiYasTablosu: [
      { from: '2008-05-01', to: '2035-12-31', kadin: 61, erkek: 63 },
      { from: '2036-01-01', to: '2037-12-31', kadin: 62, erkek: 64 },
      { from: '2038-01-01', to: '2039-12-31', kadin: 63, erkek: 65 },
      { from: '2040-01-01', to: '2041-12-31', kadin: 64, erkek: 65 },
      { from: '2042-01-01', to: '2999-12-31', kadin: 65, erkek: 65 },
    ],
    kismiGunKademesi: [
      { from: '2008-05-01', to: '2008-12-31', gun: 4600 },
      { from: '2009-01-01', to: '2009-12-31', gun: 4700 },
      { from: '2010-01-01', to: '2010-12-31', gun: 4800 },
      { from: '2011-01-01', to: '2011-12-31', gun: 4900 },
      { from: '2012-01-01', to: '2012-12-31', gun: 5000 },
      { from: '2013-01-01', to: '2013-12-31', gun: 5100 },
      { from: '2014-01-01', to: '2014-12-31', gun: 5200 },
      { from: '2015-01-01', to: '2015-12-31', gun: 5300 },
      { from: '2016-01-01', to: '2999-12-31', gun: 5400 },
    ],
    memur: {
      son5434: '2008-09-30',
      eyt: { kadin: 7200, erkek: 9000 },
      donem2Gun: 9000,
      donem2KismiGun: 5400,
      donem2KismiYas: 61,
      donem3Gun: 9000,
      kismiGun: 5400,
    },
  },
  sources: [
    {
      label: 'SGK – 4/a hizmet akdi ile çalışanlar: emeklilik şartları ve yaş tabloları',
      url: 'https://www.sgk.gov.tr/Content/Post/785eac3b-d260-47b5-8103-ae591b2ac320/4a-Hizmet-Akdi-ile-Calisanlar-2024-01-11-02-39-38',
    },
    { label: '5510 sayılı Kanun md. 28, geçici md. 10 ve md. 41 (borçlanma)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5510&MevzuatTur=1&MevzuatTertip=5' },
    { label: 'EYT (7438 sayılı Kanun) prim günü tabloları – Harbiye Hukuk derlemesi', url: 'https://www.harbiyehukuk.com/eyt-nedir-eyt-basvuru-sartlari/' },
    { label: '5434 sayılı T.C. Emekli Sandığı Kanunu, geçici md. 205 (08.09.1999 öncesi memurlar: kadın 20, erkek 25 fiili hizmet yılı)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5434&MevzuatTur=1&MevzuatTertip=3' },
    { label: 'Memurlar.net – Memurluk statüsünden emekli olmak için kaç yıl hizmet aranır? (1999–2008 arası: 25 yıl, kadın 58 / erkek 60)', url: 'https://www.memurlar.net/haber/1109653/' },
    { label: 'Memurlar.net – Memurlar için 2008 öncesi ve sonrası kısmi emeklilik şartları (5400 gün, 61/63 yaş tablosu)', url: 'https://www.memurlar.net/haber/1020835/' },
  ],
  note: 'Kesin emeklilik tarihi için e-Devlet’teki SGK “Ne Zaman Emekli Olabilirim” uygulaması ve hizmet dökümü esas alınır.',
};
