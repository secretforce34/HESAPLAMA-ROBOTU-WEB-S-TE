import { describe, expect, it } from 'vitest';
import { annualFromMonthly, annuityPayment, daysBetween, irr, monthlyFromAnnual, npv, round2, todayIsoTR } from './finance';

describe('round2', () => {
  it('kuruşa yuvarlar', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round2(-0.001)).toBe(0);
    expect(Object.is(round2(-0.001), -0)).toBe(false);
  });
});

describe('annuityPayment', () => {
  it('100.000 TL, aylık %3, 12 ay', () => {
    // 100000 * 0.03 / (1 - 1.03^-12) = 10046,2085...
    expect(annuityPayment(100_000, 0.03, 12)).toBeCloseTo(10046.21, 2);
  });
  it('faizsiz krediyi eşit böler', () => {
    expect(annuityPayment(12_000, 0, 12)).toBe(1000);
  });
});

describe('npv / irr', () => {
  it('irr, annüite faizini geri bulur', () => {
    const t = annuityPayment(100_000, 0.03, 12);
    const flows = [100_000, ...Array.from({ length: 12 }, () => -t)];
    expect(irr(flows)).toBeCloseTo(0.03, 9);
    expect(npv(0.03, flows)).toBeCloseTo(0, 6);
  });
  it('işaret değişmiyorsa null', () => {
    expect(irr([100, 50, 20])).toBeNull();
  });
});

describe('oran dönüşümleri', () => {
  it('aylık ↔ yıllık', () => {
    expect(annualFromMonthly(0.03)).toBeCloseTo(0.42576, 5);
    expect(monthlyFromAnnual(annualFromMonthly(0.025))).toBeCloseTo(0.025, 12);
  });
});

describe('tarih', () => {
  it('daysBetween', () => {
    expect(daysBetween('2026-01-01', '2026-12-31')).toBe(364);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });
  it('todayIsoTR, İstanbul saatini kullanır', () => {
    // 31 Aralık 2025 22:30 UTC = 1 Ocak 2026 01:30 İstanbul
    expect(todayIsoTR(new Date(Date.UTC(2025, 11, 31, 22, 30)))).toBe('2026-01-01');
  });
});
