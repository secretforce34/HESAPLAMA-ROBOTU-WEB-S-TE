import { describe, expect, it } from 'vitest';
import { formatDateTR, formatInputNumber, formatMonthTR, formatNumber, formatPercent, formatTL, parseTR } from './format';

describe('parseTR', () => {
  it.each([
    ['1.234.567,89', 1234567.89],
    ['50.000', 50000],
    ['12,5', 12.5],
    ['12.5', 12.5],
    ['0,75', 0.75],
    [',5', 0.5],
    ['1000', 1000],
    ['  33.030 TL ', 33030],
    ['₺1.000,50', 1000.5],
    ['%20', 20],
    ['1 000', 1000],
    ['-250,25', -250.25],
    ['1.000.000', 1000000],
  ])('%s → %d', (input, expected) => {
    expect(parseTR(input)).toBeCloseTo(expected, 10);
  });

  it.each(['', '  ', 'abc', '1,2,3', '1.2.3', '12.34,5.6', '-', '1.23,4'])('geçersiz: "%s"', (input) => {
    expect(parseTR(input)).toBeNull();
  });
});

describe('biçimlendirme', () => {
  it('formatTL', () => {
    expect(formatTL(1234.5)).toBe('1.234,50 TL');
    expect(formatTL(28075.5)).toBe('28.075,50 TL');
    expect(formatTL(-0.001)).toBe('0,00 TL');
    expect(formatTL(1999.995)).toBe('2.000,00 TL');
    expect(formatTL(1234.56, 0)).toBe('1.235 TL');
    expect(formatTL(Number.NaN)).toBe('–');
  });

  it('formatNumber / formatPercent', () => {
    expect(formatNumber(1234.5678)).toBe('1.234,57');
    expect(formatNumber(10)).toBe('10');
    expect(formatPercent(20)).toBe('%20');
    expect(formatPercent(12.5)).toBe('%12,5');
  });

  it('formatInputNumber', () => {
    expect(formatInputNumber(50000)).toBe('50.000');
    expect(formatInputNumber(1234.5)).toBe('1.234,5');
    expect(formatInputNumber(null)).toBe('');
  });

  it('tarihler', () => {
    expect(formatDateTR('2026-10-29')).toBe('29 Ekim 2026');
    expect(formatDateTR('2026-01-05')).toBe('5 Ocak 2026');
    expect(formatMonthTR('2026-08')).toBe('Ağustos 2026');
  });
});
