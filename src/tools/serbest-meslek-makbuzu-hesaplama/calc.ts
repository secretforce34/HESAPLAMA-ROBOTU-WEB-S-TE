import { smmKdvTevkifati, smmTevkifatKurali, type SmmAliciTuru } from '../../data/params/serbest-meslek';
import { round2 } from '../../lib/finance';
import { formatTL } from '../../lib/format';

export type { SmmAliciTuru };

/** Kalem tutarı hangi büyüklüğü ifade ediyor? */
export type SmmYon = 'brut' | 'net' | 'kdvDahil';

export interface SmmKalem {
  /** Girilen tutar (yöne göre: brüt ücret, net ücret ya da KDV dahil fiyat) */
  tutar: number;
  /** KDV oranı (%) */
  kdvOrani: number;
  /** Bu kalem KDV tevkifatına tabi mi? (varsayılan: evet) */
  tevkifatli?: boolean;
  /** KDV tutarını elle vermek için (KDV dahil tutardan geriye hesapta kullanılır); verilmezse brüt × oran */
  kdv?: number;
}

export interface SmmAyar {
  /** Gelir vergisi stopaj oranı (%). 0 = stopaj yok (ödeyen stopaj sorumlusu değil) */
  stopajOrani: number;
  /** KDV tevkifat payı: 0 = yok, 3 → 3/10, 4, 5, 9 … */
  tevkifatPayi: number;
  /** Hizmeti alan tarafın KDV tevkifatı bakımından türü */
  alici: SmmAliciTuru;
  /** Kısmi tevkifat tutar sınırı (KDV dahil, TL). null: sınır aranmaz. */
  tevkifatSiniri: number | null;
}

export interface SmmInput extends SmmAyar {
  yon: SmmYon;
  kalemler: SmmKalem[];
}

// ---------- Tevkifat kararı ----------

export type TevkifatNedeni = 'secilmedi' | 'tuketici' | 'alici-turu' | 'yapim-siniri' | 'tutar-siniri';

export type TevkifatDurumu =
  | { uygulanir: true; pay: number }
  | { uygulanir: false; neden: TevkifatNedeni; aciklama: string };

/**
 * Seçilen KDV tevkifatının bu makbuzda gerçekten uygulanıp uygulanmayacağını belirler.
 *  - KDV GUT I/C-2.1.3.1: KDV mükellefi olmayan alıcı (belirlenmiş alıcı değilse) tevkifat yapmaz.
 *  - KDV GUT I/C-2.1.3.2.x: her oran yalnızca belirli alıcı gruplarına karşı uygulanır.
 *  - KDV GUT I/C-2.1.3.2.1: KDV mükellefi alıcılarda 4/10 yalnızca KDV dahil 5 milyon TL ve üzerinde.
 *  - KDV GUT I/C-2.1.3.4.1: kısmi tevkifatta (2/10–9/10) işlemin KDV dahil bedeli fatura düzenleme sınırını
 *    AŞMIYORSA tevkifat yapılmaz; aşarsa tutarın tamamı üzerinden yapılır.
 */
export function tevkifatDurumu(
  pay: number,
  alici: SmmAliciTuru,
  tevkifataTabiKdvDahil: number,
  tevkifatSiniri: number | null,
): TevkifatDurumu {
  if (pay <= 0) return { uygulanir: false, neden: 'secilmedi', aciklama: '' };

  if (alici === 'tuketici') {
    return {
      uygulanir: false,
      neden: 'tuketici',
      aciklama:
        'Müşteriniz KDV mükellefi olmadığı ve belirlenmiş alıcılar arasında yer almadığı için KDV tevkifatı uygulanmaz.',
    };
  }

  const kural = smmTevkifatKurali(pay);
  if (kural && !kural.alicilar.includes(alici)) {
    const yapimSiniri = smmKdvTevkifati.values.yapimIsiMukellefAltSiniri;
    if (pay === 4 && alici === 'mukellef') {
      if (tevkifataTabiKdvDahil < yapimSiniri) {
        return {
          uygulanir: false,
          neden: 'yapim-siniri',
          aciklama: `KDV mükellefi alıcılarda 4/10 tevkifat yalnızca KDV dahil bedeli ${formatTL(yapimSiniri, 0)} ve üzerindeki işlerde uygulanır; bu makbuzda ${formatTL(tevkifataTabiKdvDahil)} olduğu için tevkifat yapılmaz.`,
        };
      }
      // 5 milyon TL ve üzeri: tevkifat uygulanır (aşağıdaki tutar sınırı kontrolüne düşer)
    } else {
      return {
        uygulanir: false,
        neden: 'alici-turu',
        aciklama: `${pay}/10 tevkifat (${kural.ad}) yalnızca ${kural.aliciMetni} karşı uygulanır; seçtiğiniz müşteri türünde tevkifat yapılmaz.`,
      };
    }
  }

  if (pay < 10 && tevkifatSiniri !== null && tevkifataTabiKdvDahil <= tevkifatSiniri) {
    return {
      uygulanir: false,
      neden: 'tutar-siniri',
      aciklama: `Tevkifata tabi tutar (KDV dahil ${formatTL(tevkifataTabiKdvDahil)}) ${formatTL(tevkifatSiniri, 0)} sınırını aşmadığı için kısmi tevkifat uygulanmaz; KDV’nin tamamı size ödenir.`,
    };
  }

  return { uygulanir: true, pay };
}

// ---------- İleri hesap: brüt ücretten ----------

export interface SmmKalemSonucu {
  brut: number;
  kdvOrani: number;
  kdv: number;
  /** brüt + KDV */
  kdvDahil: number;
  tevkifatli: boolean;
}

export interface SmmSonuc {
  kalemler: SmmKalemSonucu[];
  /** Toplam brüt ücret (KDV hariç) */
  brut: number;
  /** Gelir vergisi stopajı (müşteri keser, vergi dairesine yatırır) */
  stopaj: number;
  /** Net ücret = brüt − stopaj */
  net: number;
  kdv: number;
  /** Brüt + KDV: müşterinin makbuz için katlandığı toplam maliyet */
  kdvDahil: number;
  /** Tevkifata tabi kalemlerin KDV dahil toplamı */
  tevkifataTabiKdvDahil: number;
  tevkifatDurumu: TevkifatDurumu;
  /** Fiilen uygulanan pay (uygulanmıyorsa 0) */
  uygulananTevkifat: number;
  /** Müşterinin keseceği (KDV-2 ile kendisi ödeyeceği) KDV */
  tevkifEdilenKdv: number;
  /** Sizin müşteriden tahsil edeceğiniz KDV (KDV − tevkif edilen) */
  tahsilEdilecekKdv: number;
  /** Hesabınıza yatacak toplam: net ücret + tahsil edilecek KDV */
  tahsilat: number;
  /** Müşterinin vergi dairesine yatıracağı toplam (stopaj + tevkif edilen KDV) */
  musteriVergiOdemesi: number;
}

/** Brüt tutarlardan makbuz hesabı. Stopaj toplam brüt üzerinden, KDV kalem kalem hesaplanıp kuruşa yuvarlanır. */
export function hesaplaMakbuz(brutKalemler: SmmKalem[], ayar: SmmAyar): SmmSonuc {
  const kalemler: SmmKalemSonucu[] = brutKalemler.map((k) => {
    const brut = round2(k.tutar);
    const kdv = k.kdv !== undefined ? round2(k.kdv) : round2((brut * k.kdvOrani) / 100);
    return { brut, kdvOrani: k.kdvOrani, kdv, kdvDahil: round2(brut + kdv), tevkifatli: k.tevkifatli !== false };
  });

  const brut = round2(kalemler.reduce((t, k) => t + k.brut, 0));
  const kdv = round2(kalemler.reduce((t, k) => t + k.kdv, 0));
  // GVK md. 94/2: stopaj KDV hariç brüt ücret üzerinden hesaplanır.
  const stopaj = ayar.stopajOrani > 0 ? round2((brut * ayar.stopajOrani) / 100) : 0;
  const net = round2(brut - stopaj);
  const kdvDahil = round2(brut + kdv);

  const tabi = kalemler.filter((k) => k.tevkifatli);
  const tevkifataTabiKdvDahil = round2(tabi.reduce((t, k) => t + k.kdvDahil, 0));
  const tevkifataTabiKdv = round2(tabi.reduce((t, k) => t + k.kdv, 0));

  const durum = tevkifatDurumu(ayar.tevkifatPayi, ayar.alici, tevkifataTabiKdvDahil, ayar.tevkifatSiniri);
  const uygulananTevkifat = durum.uygulanir ? durum.pay : 0;
  const tevkifEdilenKdv = uygulananTevkifat > 0 ? round2((tevkifataTabiKdv * uygulananTevkifat) / 10) : 0;
  const tahsilEdilecekKdv = round2(kdv - tevkifEdilenKdv);
  const tahsilat = round2(net + tahsilEdilecekKdv);

  return {
    kalemler,
    brut,
    stopaj,
    net,
    kdv,
    kdvDahil,
    tevkifataTabiKdvDahil,
    tevkifatDurumu: durum,
    uygulananTevkifat,
    tevkifEdilenKdv,
    tahsilEdilecekKdv,
    tahsilat,
    musteriVergiOdemesi: round2(stopaj + tevkifEdilenKdv),
  };
}

// ---------- Ters hesaplar ----------

/** f(b) = hedef eşitliğini sağlayan, tahminin çevresindeki en uygun kuruşlu brüt değeri bulur. */
function kurusAra(tahmin: number, f: (b: number) => number, hedef: number, yaricap = 5): number {
  let en = round2(tahmin);
  let enFark = Math.abs(round2(f(en) - hedef));
  for (let d = 1; d <= yaricap && enFark > 0; d++) {
    for (const isaret of [-1, 1]) {
      const b = round2(tahmin + isaret * d * 0.01);
      if (b < 0) continue;
      const fark = Math.abs(round2(f(b) - hedef));
      if (fark < enFark) {
        en = b;
        enFark = fark;
      }
    }
  }
  return en;
}

/** Net ücretten brüt ücret: net = brüt − stopaj. Sonuç ileri hesapla birebir tutacak şekilde kuruşa oturtulur. */
export function brutuNettenBul(net: number, stopajOrani: number): number {
  const hedef = round2(net);
  if (stopajOrani <= 0) return hedef;
  const tahmin = hedef / (1 - stopajOrani / 100);
  return kurusAra(tahmin, (b) => round2(b - round2((b * stopajOrani) / 100)), hedef);
}

/**
 * KDV dahil fiyattan brüt ücret: brüt = dahil ÷ (1 + oran), kuruşa yuvarlanır. KDV ise farktan bulunur
 * (hesaplaSmm içinde), böylece brüt + KDV her zaman girilen KDV dahil tutara tam eşit olur.
 */
export function brutuKdvDahildenBul(kdvDahil: number, kdvOrani: number): number {
  const hedef = round2(kdvDahil);
  if (kdvOrani <= 0) return hedef;
  return round2(hedef / (1 + kdvOrani / 100));
}

/** Girilen kalemleri yöne göre brüte çevirip makbuzu hesaplar. */
export function hesaplaSmm(input: SmmInput): SmmSonuc {
  const brutKalemler = input.kalemler.map((k): SmmKalem => {
    if (input.yon === 'net') return { ...k, tutar: brutuNettenBul(k.tutar, input.stopajOrani) };
    if (input.yon === 'kdvDahil') {
      const brut = brutuKdvDahildenBul(k.tutar, k.kdvOrani);
      return { ...k, tutar: brut, kdv: round2(round2(k.tutar) - brut) };
    }
    return { ...k, tutar: round2(k.tutar) };
  });
  return hesaplaMakbuz(brutKalemler, input);
}

export interface TahsilatTersSonucu {
  /** Seçilen (en düşük) brüt aday için makbuz */
  sonuc: SmmSonuc;
  /** Aynı tahsilatı veren tüm brüt adaylar (artan). Tevkifat sınırı nedeniyle iki aday çıkabilir. */
  adaylar: number[];
  /** Hesaplanan tahsilat − girilen tahsilat (kuruş yuvarlama farkı; normalde 0) */
  fark: number;
}

/**
 * "Hesabıma X TL yattı" → makbuz brütü. Tek kalem varsayılır.
 * Tevkifat sınırı aşıldığında tahsilat aniden düştüğü için aynı tahsilatı veren iki brüt tutar çıkabilir:
 * biri sınır altında (tevkifat yok), biri sınır üstünde (tevkifatlı). İkisi de döndürülür.
 */
export function hesaplaTahsilattan(tahsilat: number, kdvOrani: number, ayar: SmmAyar): TahsilatTersSonucu {
  const hedef = round2(tahsilat);
  const s = ayar.stopajOrani / 100;
  const k = kdvOrani / 100;
  const f = (b: number) => hesaplaMakbuz([{ tutar: b, kdvOrani }], ayar).tahsilat;

  const tahminler = [hedef / (1 - s + k)];
  if (ayar.tevkifatPayi > 0) tahminler.push(hedef / (1 - s + k * (1 - ayar.tevkifatPayi / 10)));

  const bulunan = new Map<number, number>(); // brüt → |fark|
  for (const t of tahminler) {
    const b = kurusAra(t, f, hedef);
    bulunan.set(b, Math.abs(round2(f(b) - hedef)));
  }
  let adaylar = [...bulunan.entries()].filter(([, fark]) => fark <= 0.01).map(([b]) => b);
  if (adaylar.length === 0) {
    adaylar = [[...bulunan.entries()].sort((a, b) => a[1] - b[1])[0][0]];
  }
  adaylar.sort((a, b) => a - b);

  const sonuc = hesaplaMakbuz([{ tutar: adaylar[0], kdvOrani }], ayar);
  return { sonuc, adaylar, fark: round2(sonuc.tahsilat - hedef) };
}

// ---------- Doğrulama ----------

export function validateKalem(tutar: number | null, kdvOrani: number | null): { tutar?: string; kdvOrani?: string } {
  const e: { tutar?: string; kdvOrani?: string } = {};
  if (tutar === null || Number.isNaN(tutar)) e.tutar = 'Bir tutar girin.';
  else if (tutar < 0) e.tutar = 'Tutar negatif olamaz.';
  if (kdvOrani === null || Number.isNaN(kdvOrani)) e.kdvOrani = 'Bir KDV oranı girin.';
  else if (kdvOrani < 0 || kdvOrani > 100) e.kdvOrani = 'KDV oranı %0 ile %100 arasında olmalı.';
  return e;
}

export function validateStopaj(oran: number | null): string | undefined {
  if (oran === null || Number.isNaN(oran)) return 'Bir stopaj oranı girin.';
  if (oran < 0 || oran >= 100) return 'Stopaj oranı %0 ile %100 arasında (100 hariç) olmalı.';
  return undefined;
}
