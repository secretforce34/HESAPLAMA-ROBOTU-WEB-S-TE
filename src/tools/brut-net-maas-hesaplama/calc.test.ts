import { describe, expect, it } from 'vitest';
import { maasYili } from '../../data/params/maas';
import {
  asgariUcretIstisnalari,
  ekOdemeVergisi,
  hesaplaBordro,
  nettenBrute,
  tarifeVergisi,
  validateAylar,
  validateTutar,
} from './calc';

const her = (n: number) => Array(12).fill(n) as number[];

describe('ÇSGB 2026 asgari ücret tablosu', () => {
  // Kaynak: https://www.csgb.gov.tr/Media/gm2fekds/asgari-%C3%BCcret-2026.pdf
  it('brüt 33.030 → net 28.075,50 (12 ayın hepsinde; GV ve DV tamamen istisna)', () => {
    const b = hesaplaBordro(her(33030), { yil: 2026, tesvik: 'yok' });
    for (const a of b.aylar) {
      expect(a.sgkIsci).toBe(4624.2);
      expect(a.issizlikIsci).toBe(330.3);
      expect(a.gvOdenecek).toBe(0);
      expect(a.dvOdenecek).toBe(0);
      expect(a.net).toBe(28075.5);
    }
    expect(b.toplam.net).toBe(336906);
  });

  it('işverene maliyet: indirimsiz 40.874,63 / 2 puan 40.214,03 / imalat 5 puan 39.223,13', () => {
    const yok = hesaplaBordro(her(33030), { yil: 2026, tesvik: 'yok' }).aylar[0];
    const genel = hesaplaBordro(her(33030), { yil: 2026, tesvik: 'genel' }).aylar[0];
    const imalat = hesaplaBordro(her(33030), { yil: 2026, tesvik: 'imalat' }).aylar[0];
    expect(yok.sgkIsveren).toBe(7184.03); // %21,75
    expect(genel.sgkIsveren).toBe(6523.43); // %19,75
    expect(imalat.sgkIsveren).toBe(5532.53); // %16,75
    expect(yok.issizlikIsveren).toBe(660.6);
    expect(yok.maliyet).toBe(40874.63);
    expect(genel.maliyet).toBe(40214.03);
    expect(imalat.maliyet).toBe(39223.13);
    expect(genel.hazineIndirimi).toBe(660.6); // 33.030 × %2
  });
});

describe('asgari ücret istisnası (GVK 23/18, Tebliğ 319)', () => {
  it('2026: Ocak–Haziran 4.211,33; Temmuz 4.537,75 (dilim geçişi); Ağustos–Aralık 5.615,10; DV 250,70', () => {
    const ist = asgariUcretIstisnalari(2026);
    expect(ist.slice(0, 6).map((x) => x.gv)).toEqual(Array(6).fill(4211.33));
    // 6 × 28.075,50 = 168.453 → 7. ayda 196.528,50: 21.547 × %15 + 6.528,50 × %20
    expect(ist[6].gv).toBe(4537.75);
    expect(ist.slice(7).map((x) => x.gv)).toEqual(Array(5).fill(5615.1));
    expect(ist.every((x) => x.dv === 250.7 && x.matrah === 28075.5)).toBe(true);
  });

  it('2025: asgari matrah 22.104,67; Ağustos’ta dilim geçişi 4.257,57; DV 197,38', () => {
    const ist = asgariUcretIstisnalari(2025);
    expect(ist[0].matrah).toBe(22104.67);
    expect(ist[0].gv).toBe(3315.7);
    expect(ist[6].gv).toBe(3315.7);
    // 7 × 22.104,67 = 154.732,69 → 3.267,31 × %15 + 18.837,36 × %20 = 4.257,57
    expect(ist[7].gv).toBe(4257.57);
    expect(ist[8].gv).toBe(4420.93);
    expect(ist[0].dv).toBe(197.38);
  });

  it('ÇSGB 2025: brüt 26.005,50 → net 22.104,67; Hazine desteği Ocak 5, Şubat’tan itibaren 4 puan', () => {
    // Kaynak: https://www.csgb.gov.tr/Media/f4xjys1e/2025-asgari-%C3%BCcret_.pdf
    const genel = hesaplaBordro(her(26005.5), { yil: 2025, tesvik: 'genel' });
    expect(genel.aylar.every((a) => a.net === 22104.67)).toBe(true);
    expect(genel.aylar[0].sgkIsveren).toBe(4095.87); // %15,75
    expect(genel.aylar[0].maliyet).toBe(30621.48);
    expect(genel.aylar[1].maliyet).toBe(30881.53); // %16,75: 4.355,92 + 520,11
    const imalat = hesaplaBordro(her(26005.5), { yil: 2025, tesvik: 'imalat' });
    expect(imalat.aylar[11].maliyet).toBe(30621.48);
  });
});

describe('gelir vergisi tarifesi (GVK md. 103)', () => {
  it('2026 dilim sınırlarındaki vergi Resmî Gazete ile aynı', () => {
    const t = maasYili(2026).ucretTarifesi;
    expect(tarifeVergisi(190000, t)).toBe(28500);
    expect(tarifeVergisi(400000, t)).toBe(70500);
    expect(tarifeVergisi(1500000, t)).toBe(367500);
    expect(tarifeVergisi(5300000, t)).toBe(1697500);
    expect(tarifeVergisi(6300000, t)).toBe(2097500);
    expect(tarifeVergisi(0, t)).toBe(0);
  });

  it('2025 ücret tarifesi', () => {
    const t = maasYili(2025).ucretTarifesi;
    expect(tarifeVergisi(158000, t)).toBe(23700);
    expect(tarifeVergisi(330000, t)).toBe(58100);
    expect(tarifeVergisi(1200000, t)).toBe(293000);
    expect(tarifeVergisi(4300000, t)).toBe(1378000);
  });
});

describe('yüksek maaşta dilim geçişleri (elle doğrulandı)', () => {
  it('brüt 150.000 TL (2026): Ocak %15, Şubat’ta %20, Nisan’da %27, Aralık’ta %35 dilimi', () => {
    // SGK 21.000 + işsizlik 1.500 → aylık matrah 127.500; DV 1.138,50 − 250,70 = 887,80
    const b = hesaplaBordro(her(150000), { yil: 2026 });
    const [oca, sub, mar, nis, may] = b.aylar;
    // Ocak: 127.500 × %15 = 19.125 − 4.211,33 = 14.913,67
    expect(oca.gvHesaplanan).toBe(19125);
    expect(oca.gvOdenecek).toBe(14913.67);
    expect(oca.net).toBe(111698.53);
    // Şubat: T(255.000) − T(127.500) = 41.500 − 19.125 = 22.375
    expect(sub.gvHesaplanan).toBe(22375);
    expect(sub.net).toBe(108448.53);
    expect(sub.dilim).toBe(20);
    // Mart: 67.000 − 41.500 = 25.500
    expect(mar.net).toBe(105323.53);
    // Nisan: T(510.000) = 100.200 → 33.200
    expect(nis.gvHesaplanan).toBe(33200);
    expect(nis.net).toBe(97623.53);
    expect(nis.dilim).toBe(27);
    expect(may.net).toBe(96398.53);
    // Temmuz: 34.425 − 4.537,75; Ağustos: 34.425 − 5.615,10
    expect(b.aylar[6].net).toBe(96724.95);
    expect(b.aylar[7].net).toBe(97802.3);
    // Aralık: T(1.530.000) − T(1.402.500) = 378.000 − 341.175 = 36.825 − 5.615,10
    expect(b.aylar[11].gvHesaplanan).toBe(36825);
    expect(b.aylar[11].net).toBe(95402.3);
    expect(b.aylar[11].dilim).toBe(35);
    // İşveren (2 puan): 29.625 + 3.000
    expect(oca.maliyet).toBe(182625);
  });

  it('brüt 400.000 TL: SGK tavanı (297.270) aşılır, primler tavandan kesilir', () => {
    const b = hesaplaBordro(her(400000), { yil: 2026 });
    const oca = b.aylar[0];
    expect(oca.sgkMatrahi).toBe(297270);
    expect(oca.tavanAsimi).toBe(102730);
    expect(oca.sgkIsci).toBe(41617.8);
    expect(oca.issizlikIsci).toBe(2972.7);
    expect(oca.gvMatrahi).toBe(355409.5);
    // 28.500 + 165.409,50 × %20 = 61.581,90 − 4.211,33
    expect(oca.gvOdenecek).toBe(57370.57);
    expect(oca.dvOdenecek).toBe(2785.3);
    expect(oca.net).toBe(295253.63);
    expect(oca.maliyet).toBe(464656.23); // 58.710,83 + 5.945,40
    // Şubat: T(710.819) − T(355.409,50) = 154.421,13 − 61.581,90 = 92.839,23
    expect(b.aylar[1].gvHesaplanan).toBe(92839.23);
    expect(b.aylar[1].net).toBe(263996.3);
    // Mayıs: T(1.777.047,50) − T(1.421.638) = 464.466,625 − 346.342,26 → 118.124,37
    expect(b.aylar[4].gvHesaplanan).toBe(118124.37);
    expect(b.aylar[4].net).toBe(238711.16);
    expect(b.aylar[4].dilim).toBe(35);
    // Hep tavanda olduğundan devreden matrah kullanılamaz
    expect(b.aylar.every((a) => a.devirKullanilan === 0)).toBe(true);
  });
});

describe('SGK tavanını aşan ikramiyenin devri (5510 md. 80/1-d)', () => {
  it('Mart’ta 250.000 TL ikramiye: aşan 202.730 TL izleyen iki aya kaydırılır', () => {
    const brutler = her(250000);
    brutler[2] = 500000;
    const devirli = hesaplaBordro(brutler, { yil: 2026, sgkDevir: true });
    expect(devirli.aylar[2].sgkMatrahi).toBe(297270);
    expect(devirli.aylar[3].devirKullanilan).toBe(47270);
    expect(devirli.aylar[3].sgkMatrahi).toBe(297270);
    expect(devirli.aylar[4].sgkMatrahi).toBe(297270);
    expect(devirli.aylar[5].sgkMatrahi).toBe(250000); // iki aydan sonra kalan düşer
    const devirsiz = hesaplaBordro(brutler, { yil: 2026, sgkDevir: false });
    expect(devirsiz.aylar[3].sgkMatrahi).toBe(250000);
    expect(devirli.aylar[3].sgkIsci).toBe(41617.8);
    expect(devirsiz.aylar[3].sgkIsci).toBe(35000);
  });
});

describe('netten brüte', () => {
  it('net 28.075,50 → brüt 33.030 (asgari ücret)', () => {
    const b = nettenBrute(her(28075.5), { yil: 2026 });
    expect(b.aylar.every((a) => a.brut === 33030)).toBe(true);
  });

  it('aynı net için gereken brüt yıl içinde artar (kümülatif matrah)', () => {
    const b = nettenBrute(her(100000), { yil: 2026 });
    expect(b.aylar.every((a) => Math.abs(a.net - 100000) <= 0.02)).toBe(true);
    expect(b.aylar[11].brut).toBeGreaterThan(b.aylar[0].brut);
  });

  it('gidiş-dönüş: brüt → net → brüt aynı brütü verir (farklı aylar, tavan, emekli)', () => {
    const senaryolar: [number[], Parameters<typeof hesaplaBordro>[1]][] = [
      [her(85000), { yil: 2026 }],
      [[60000, 60000, 180000, 60000, 60000, 60000, 75000, 75000, 75000, 75000, 75000, 150000], { yil: 2026 }],
      [her(400000), { yil: 2026 }],
      [her(70000), { yil: 2026, emekli: true, engellilik: 2 }],
      [her(55000), { yil: 2025, tesvik: 'imalat' }],
    ];
    for (const [brutler, s] of senaryolar) {
      const ileri = hesaplaBordro(brutler, s);
      const geri = nettenBrute(
        ileri.aylar.map((a) => a.net),
        s,
      );
      geri.aylar.forEach((a, i) => {
        expect(Math.abs(a.brut - brutler[i])).toBeLessThanOrEqual(0.02);
        expect(a.net).toBe(ileri.aylar[i].net);
      });
    }
  });
});

describe('emekli (SGDP) ve engellilik indirimi', () => {
  it('SGDP: işçi %7,5, işsizlik yok; işveren %24,75 ve Hazine desteği uygulanmaz', () => {
    const a = hesaplaBordro(her(50000), { yil: 2026, emekli: true, tesvik: 'genel' }).aylar[0];
    expect(a.sgkIsci).toBe(3750);
    expect(a.issizlikIsci).toBe(0);
    // 46.250 × %15 = 6.937,50 − 4.211,33 (istisna SGDP’de değişmez)
    expect(a.gvOdenecek).toBe(2726.17);
    expect(a.net).toBe(43395.03);
    expect(a.sgkIsveren).toBe(12375);
    expect(a.issizlikIsveren).toBe(0);
    expect(a.hazineIndirimi).toBe(0);
    expect(a.maliyet).toBe(62375);
  });

  it('1. derece engellilik (2026: 12.000 TL) matrahı düşürür; asgari ücretlide etkisi yoktur', () => {
    const normal = hesaplaBordro(her(50000), { yil: 2026 }).aylar[0];
    const engelli = hesaplaBordro(her(50000), { yil: 2026, engellilik: 1 }).aylar[0];
    expect(engelli.engellilikIndirimi).toBe(12000);
    expect(engelli.gvMatrahi).toBe(30500);
    expect(engelli.net).toBe(42007.53);
    expect(round(engelli.net - normal.net)).toBe(1800); // 12.000 × %15
    const asgari = hesaplaBordro(her(33030), { yil: 2026, engellilik: 1 }).aylar[0];
    expect(asgari.net).toBe(28075.5);
  });
});

describe('ek ödeme vergisi (ihbar tazminatı)', () => {
  it('Ekim’de 50.000 TL maaşla birlikte 100.000 TL: tamamı %27 dilimde', () => {
    const v = ekOdemeVergisi({ yil: 2026, ay: 10, oncekiKumulatif: 382500, ayBrut: 50000, ayMatrah: 42500, ekBrut: 100000 });
    expect(v.gv).toBe(27000);
    expect(v.dv).toBe(759);
    expect(v.dilim).toBe(27);
  });

  it('ayın 2’sinde ayrılan işçide kullanılmayan istisna ihbar vergisini karşılar (Tebliğ 319 md. 6/2)', () => {
    const v = ekOdemeVergisi({ yil: 2026, ay: 1, oncekiKumulatif: 0, ayBrut: 3333.33, ayMatrah: 2833.33, ekBrut: 20000 });
    expect(v.gv).toBe(0);
    expect(v.dv).toBe(0);
  });
});

describe('doğrulama', () => {
  it('tutar ve ay listesi', () => {
    expect(validateTutar(null)).toBeDefined();
    expect(validateTutar(-1)).toBeDefined();
    expect(validateTutar(50000)).toBeUndefined();
    expect(validateAylar(her(0))).toHaveProperty('0');
    expect(validateAylar([...her(1000).slice(0, 11), null])).toHaveProperty('11');
    expect(validateAylar(her(50000))).toEqual({});
  });
});

function round(n: number) {
  return Math.round(n * 100) / 100;
}
