import { parsePromoterElement, PromoterElement } from '../../src/gene';
import { parseNucleotidePattern, NucleotidePattern } from '../../src/pattern';

function pattern(input: string): NucleotidePattern {
  const result = parseNucleotidePattern(input);
  if (!result.success) {
    throw new Error(`parseNucleotidePattern unexpectedly failed for '${input}'`);
  }
  return result.data;
}

function element(name: string, p: string, position: number, scoreWeight = 0): PromoterElement {
  const result = parsePromoterElement(name, pattern(p), position, scoreWeight);
  if (!result.success) {
    throw new Error(`parsePromoterElement unexpectedly failed: ${JSON.stringify(result.error)}`);
  }
  return result.data;
}

describe('PromoterElement', () => {
  describe('parsePromoterElement success cases', () => {
    test('creates element with negative position', () => {
      const el = element('TATA', 'TATAWAR', -25, 10);
      expect(el.name).toBe('TATA');
      expect(el.position).toBe(-25);
      expect(el.scoreWeight).toBe(10);
      expect(el.pattern.pattern).toBe('TATAWAR');
    });

    test('creates element overlapping TSS (position 0)', () => {
      const el = element('Inr', 'BBCABW', 0, 8);
      expect(el.position).toBe(0);
    });

    test('creates element downstream of TSS', () => {
      const el = element('DPE', 'RGWYV', 30, 6);
      expect(el.position).toBe(30);
    });
  });

  describe('parsePromoterElement failure cases', () => {
    test('rejects empty name', () => {
      const result = parsePromoterElement('', pattern('AAAA'), 0, 0);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('promoter-element/empty-name');
      }
    });

    test('rejects non-finite position', () => {
      const result = parsePromoterElement('X', pattern('AAAA'), Number.NaN, 0);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('promoter-element/invalid-position');
      }
    });

    test('rejects non-finite score weight', () => {
      const result = parsePromoterElement('X', pattern('AAAA'), 0, Number.POSITIVE_INFINITY);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('promoter-element/invalid-score-weight');
      }
    });
  });

  describe('toString', () => {
    test('formats as name@position', () => {
      expect(element('TATA', 'TATAWAR', -25, 10).toString()).toBe('TATA@-25');
      expect(element('Inr', 'BBCABW', 0, 8).toString()).toBe('Inr@0');
      expect(element('DPE', 'RGWYV', 30, 6).toString()).toBe('DPE@30');
    });
  });

  describe('equals', () => {
    test('returns true for elements that match on name/position/scoreWeight/pattern', () => {
      const a = element('TATA', 'TATAWAR', -25, 10);
      const b = element('TATA', 'TATAWAR', -25, 10);
      expect(a.equals(b)).toBe(true);
    });

    test('returns false when name differs', () => {
      expect(element('TATA', 'TATAWAR', -25, 10).equals(element('GC', 'TATAWAR', -25, 10))).toBe(
        false,
      );
    });

    test('returns false when position differs', () => {
      expect(element('TATA', 'TATAWAR', -25, 10).equals(element('TATA', 'TATAWAR', 30, 10))).toBe(
        false,
      );
    });

    test('returns false when pattern differs', () => {
      expect(element('TATA', 'TATAWAR', -25, 10).equals(element('TATA', 'GGGCGG', -25, 10))).toBe(
        false,
      );
    });

    test('returns false when scoreWeight differs', () => {
      expect(element('TATA', 'TATAWAR', -25, 10).equals(element('TATA', 'TATAWAR', -25, 5))).toBe(
        false,
      );
    });
  });
});
