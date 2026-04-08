import { expect } from 'vitest';
import Decimal from 'decimal.js';

expect.extend({
  toEqualDecimal(received: Decimal, expected: Decimal | number | string) {
    const exp = new Decimal(expected);
    return {
      pass: received.eq(exp),
      message: () =>
        `expected ${received.toString()} ${this.isNot ? 'not ' : ''}to equal ${exp.toString()}`,
    };
  },
});

// ---------------------------------------------------------------------------
// Type augmentation — makes expect(x).toEqualDecimal(y) type-safe
// ---------------------------------------------------------------------------

interface DecimalMatchers<R = unknown> {
  toEqualDecimal(expected: Decimal | number | string): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends DecimalMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends DecimalMatchers {}
}
