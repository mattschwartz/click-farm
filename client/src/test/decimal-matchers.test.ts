import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import './decimal-matchers.ts';

describe('toEqualDecimal', () => {
  it('passes when Decimal values are equal', () => {
    expect(new Decimal(42)).toEqualDecimal(42);
  });

  it('passes with string expected', () => {
    expect(new Decimal('123.456')).toEqualDecimal('123.456');
  });

  it('passes with Decimal expected', () => {
    expect(new Decimal(100)).toEqualDecimal(new Decimal(100));
  });

  it('fails when values differ', () => {
    expect(() => {
      expect(new Decimal(1)).toEqualDecimal(2);
    }).toThrow();
  });

  it('works with .not', () => {
    expect(new Decimal(1)).not.toEqualDecimal(2);
  });

  it('handles very large values beyond MAX_SAFE_INTEGER', () => {
    const big = new Decimal('9007199254740992000000');
    expect(big).toEqualDecimal('9007199254740992000000');
    expect(big).not.toEqualDecimal('9007199254740992000001');
  });

  it('handles very small fractional values', () => {
    expect(new Decimal('0.0000000000000001')).toEqualDecimal('0.0000000000000001');
  });
});
