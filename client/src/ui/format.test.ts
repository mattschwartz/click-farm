import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { fmtCompact, fmtCompactInt, fmtRate, fmtDuration } from './format.ts';

// ---------------------------------------------------------------------------
// fmtCompact
// ---------------------------------------------------------------------------
describe('fmtCompact', () => {
  it('returns — for non-finite values', () => {
    expect(fmtCompact(Infinity)).toBe('—');
    expect(fmtCompact(-Infinity)).toBe('—');
    expect(fmtCompact(NaN)).toBe('—');
  });

  it('formats sub-10 values to 2 decimals', () => {
    expect(fmtCompact(0)).toBe('0.00');
    expect(fmtCompact(1.5)).toBe('1.50');
    expect(fmtCompact(9.99)).toBe('9.99');
  });

  it('formats 10–99 to 1 decimal', () => {
    expect(fmtCompact(10)).toBe('10.0');
    expect(fmtCompact(42.7)).toBe('42.7');
    expect(fmtCompact(99.9)).toBe('99.9');
  });

  it('formats 100–999 as integer', () => {
    expect(fmtCompact(100)).toBe('100');
    expect(fmtCompact(999)).toBe('999');
  });

  it('formats 1,000–9,999 with comma', () => {
    expect(fmtCompact(1000)).toBe('1,000');
    expect(fmtCompact(9999)).toBe('9,999');
  });

  it('formats ≥10,000 as K with 1 decimal (UX spec §5.1)', () => {
    expect(fmtCompact(10_000)).toBe('10.0K');
    expect(fmtCompact(12_400)).toBe('12.4K');
    expect(fmtCompact(99_900)).toBe('99.9K');
  });

  it('formats millions', () => {
    expect(fmtCompact(1_000_000)).toBe('1.00M');
    expect(fmtCompact(1_234_567)).toBe('1.23M');
  });

  it('formats billions', () => {
    expect(fmtCompact(1_000_000_000)).toBe('1.00B');
    expect(fmtCompact(2_500_000_000)).toBe('2.50B');
  });

  it('formats trillions', () => {
    expect(fmtCompact(1e12)).toBe('1.00T');
    expect(fmtCompact(5.5e12)).toBe('5.50T');
  });

  it('formats quadrillions (Qa)', () => {
    expect(fmtCompact(1e15)).toBe('1.00Qa');
    expect(fmtCompact(3.7e15)).toBe('3.70Qa');
  });

  it('formats quintillions (Qi)', () => {
    expect(fmtCompact(1e18)).toBe('1.00Qi');
  });

  it('formats sextillions (Sx)', () => {
    expect(fmtCompact(1e21)).toBe('1.00Sx');
  });

  it('formats septillions (Sp)', () => {
    expect(fmtCompact(1e24)).toBe('1.00Sp');
  });

  it('formats octillions (Oc)', () => {
    expect(fmtCompact(1e27)).toBe('1.00Oc');
  });

  it('formats nonillions (No)', () => {
    expect(fmtCompact(1e30)).toBe('1.00No');
  });

  it('formats decillions (Dc)', () => {
    expect(fmtCompact(1e33)).toBe('1.00Dc');
    expect(fmtCompact(9.99e33)).toBe('9.99Dc');
  });

  // New tiers (Ud through Vg)
  it('formats undecillions (Ud)', () => {
    expect(fmtCompact(1e36)).toBe('1.00Ud');
    expect(fmtCompact(5.5e36)).toBe('5.50Ud');
  });

  it('formats duodecillions (Dd)', () => {
    expect(fmtCompact(1e39)).toBe('1.00Dd');
  });

  it('formats tredecillions (Td)', () => {
    expect(fmtCompact(1e42)).toBe('1.00Td');
  });

  it('formats quattuordecillions (Qad) with 0 decimals', () => {
    expect(fmtCompact(1e45)).toBe('1Qad');
    expect(fmtCompact(3.7e45)).toBe('4Qad');
  });

  it('formats quindecillions (Qid) with 0 decimals', () => {
    expect(fmtCompact(1e48)).toBe('1Qid');
  });

  it('formats sexdecillions (Sxd) with 0 decimals', () => {
    expect(fmtCompact(1e51)).toBe('1Sxd');
  });

  it('formats septendecillions (Spd) with 0 decimals', () => {
    expect(fmtCompact(1e54)).toBe('1Spd');
  });

  it('formats octodecillions (Ocd) with 0 decimals', () => {
    expect(fmtCompact(1e57)).toBe('1Ocd');
  });

  it('formats novemdecillions (Nod) with 0 decimals', () => {
    expect(fmtCompact(1e60)).toBe('1Nod');
  });

  it('formats vigintillions (Vg)', () => {
    expect(fmtCompact(1e63)).toBe('1.00Vg');
  });

  it('falls back to clean exponential notation beyond Vg range', () => {
    // 1e64 → "10.00Vg" (still within readable Vg range)
    expect(fmtCompact(1e64)).toBe('10.00Vg');
    // 1e66+ → exponential
    expect(fmtCompact(1e66)).toBe('1.00e+66');
    expect(fmtCompact(1.4128611421938976e+151)).toBe('1.41e+151');
  });

  // Decimal inputs
  it('accepts Decimal inputs', () => {
    expect(fmtCompact(new Decimal(42.7))).toBe('42.7');
    expect(fmtCompact(new Decimal(1e15))).toBe('1.00Qa');
    expect(fmtCompact(new Decimal('1e36'))).toBe('1.00Ud');
  });

  it('uses Decimal.toExponential for overflow with Decimal inputs', () => {
    const big = new Decimal('1.23456789e70');
    expect(fmtCompact(big)).toBe('1.23e+70');
  });
});

// ---------------------------------------------------------------------------
// fmtCompactInt
// ---------------------------------------------------------------------------
describe('fmtCompactInt', () => {
  it('returns — for non-finite values', () => {
    expect(fmtCompactInt(Infinity)).toBe('—');
    expect(fmtCompactInt(NaN)).toBe('—');
  });

  it('floors fractional input', () => {
    expect(fmtCompactInt(999.9)).toBe('999');
    expect(fmtCompactInt(1_499.9)).toBe('1,499');
  });

  it('formats below 10k with locale commas', () => {
    expect(fmtCompactInt(0)).toBe('0');
    expect(fmtCompactInt(1_234)).toBe('1,234');
    expect(fmtCompactInt(9_999)).toBe('9,999');
  });

  it('formats ≥10,000 as K with 1 decimal', () => {
    expect(fmtCompactInt(10_000)).toBe('10.0K');
    expect(fmtCompactInt(50_000)).toBe('50.0K');
    expect(fmtCompactInt(99_900)).toBe('99.9K');
  });

  it('formats millions', () => {
    expect(fmtCompactInt(1_000_000)).toBe('1.00M');
  });

  it('formats through the full suffix chain', () => {
    expect(fmtCompactInt(1e12)).toBe('1.00T');
    expect(fmtCompactInt(1e15)).toBe('1.00Qa');
    expect(fmtCompactInt(1e18)).toBe('1.00Qi');
    expect(fmtCompactInt(1e21)).toBe('1.00Sx');
    expect(fmtCompactInt(1e24)).toBe('1.00Sp');
    expect(fmtCompactInt(1e27)).toBe('1.00Oc');
    expect(fmtCompactInt(1e30)).toBe('1.00No');
    expect(fmtCompactInt(1e33)).toBe('1.00Dc');
  });

  it('formats extended tiers (Ud through Vg)', () => {
    expect(fmtCompactInt(1e36)).toBe('1.00Ud');
    expect(fmtCompactInt(1e39)).toBe('1.00Dd');
    expect(fmtCompactInt(1e42)).toBe('1.00Td');
    expect(fmtCompactInt(1e45)).toBe('1Qad');
    expect(fmtCompactInt(1e48)).toBe('1Qid');
    expect(fmtCompactInt(1e51)).toBe('1Sxd');
    expect(fmtCompactInt(1e54)).toBe('1Spd');
    expect(fmtCompactInt(1e57)).toBe('1Ocd');
    expect(fmtCompactInt(1e60)).toBe('1Nod');
    expect(fmtCompactInt(1e63)).toBe('1.00Vg');
  });

  it('falls back to clean exponential notation beyond Vg range', () => {
    expect(fmtCompactInt(1e64)).toBe('10.00Vg');
    expect(fmtCompactInt(1e66)).toBe('1.00e+66');
    expect(fmtCompactInt(1.4128611421938976e+151)).toBe('1.41e+151');
  });

  // Decimal inputs
  it('accepts Decimal inputs', () => {
    expect(fmtCompactInt(new Decimal(1234))).toBe('1,234');
    expect(fmtCompactInt(new Decimal(1e15))).toBe('1.00Qa');
  });
});

// ---------------------------------------------------------------------------
// fmtRate
// ---------------------------------------------------------------------------
describe('fmtRate', () => {
  it('returns 0/s for zero or negative', () => {
    expect(fmtRate(0)).toBe('0/s');
    expect(fmtRate(-5)).toBe('0/s');
  });

  it('formats a small rate', () => {
    expect(fmtRate(18)).toBe('+18.0/s');
  });

  it('formats a K rate', () => {
    expect(fmtRate(12_500)).toBe('+12.5K/s');
  });

  it('formats a large rate with SI suffix (§4.2 — no raw digits)', () => {
    expect(fmtRate(127_097_600.7)).toBe('+127.10M/s');
  });

  it('accepts Decimal input', () => {
    expect(fmtRate(new Decimal(18))).toBe('+18.0/s');
  });
});

// ---------------------------------------------------------------------------
// fmtDuration
// ---------------------------------------------------------------------------
describe('fmtDuration', () => {
  it('formats seconds', () => {
    expect(fmtDuration(30_000)).toBe('30s');
    expect(fmtDuration(59_000)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(fmtDuration(90_000)).toBe('1m 30s');
  });

  it('formats hours and minutes', () => {
    expect(fmtDuration(3_661_000)).toBe('1h 1m');
  });

  it('formats days and hours', () => {
    expect(fmtDuration(90_000_000)).toBe('1d 1h');
  });
});
