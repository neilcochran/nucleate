import {
  parsePromoter,
  parsePromoterElement,
  Promoter,
  PromoterElement,
  PROMOTER_SYNERGY_MULTIPLIER,
} from '../../src/gene';
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

function promoter(tss: number, elements: PromoterElement[], name?: string): Promoter {
  const result = parsePromoter(tss, elements, name);
  if (!result.success) {
    throw new Error(`parsePromoter unexpectedly failed: ${JSON.stringify(result.error)}`);
  }
  return result.data;
}

describe('Promoter', () => {
  let tataElement: PromoterElement;
  let inrElement: PromoterElement;
  let dpeElement: PromoterElement;
  let caatElement: PromoterElement;

  beforeEach(() => {
    tataElement = element('TATA', 'TATAWAR', -25, 10);
    inrElement = element('Inr', 'BBCABW', 0, 8);
    dpeElement = element('DPE', 'RGWYV', 30, 6);
    caatElement = element('CAAT', 'GGCCAATCT', -75, 5);
  });

  describe('parsePromoter success cases', () => {
    test('creates valid promoter with single element', () => {
      const p = promoter(1000, [tataElement]);
      expect(p.transcriptionStartSite).toBe(1000);
      expect(p.elements).toHaveLength(1);
      expect(p.elements[0]).toBe(tataElement);
      expect(p.name).toBeUndefined();
    });

    test('creates promoter with multiple elements and name', () => {
      const p = promoter(1000, [tataElement, inrElement, dpeElement], 'test-promoter');
      expect(p.elements).toHaveLength(3);
      expect(p.name).toBe('test-promoter');
    });

    test('elements array is frozen', () => {
      const p = promoter(1000, [tataElement]);
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p.elements as any).push(inrElement);
      }).toThrow();
    });

    test('handles empty elements array', () => {
      const p = promoter(1000, []);
      expect(p.elements).toHaveLength(0);
    });
  });

  describe('parsePromoter failure cases', () => {
    test('rejects negative TSS with kind=invalid-tss', () => {
      const result = parsePromoter(-100, [tataElement]);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-tss');
      }
    });

    test('rejects non-finite TSS', () => {
      const result = parsePromoter(Number.POSITIVE_INFINITY, [tataElement]);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-tss');
      }
    });
  });

  describe('element accessors', () => {
    test('getElementsByName filters by element name', () => {
      const p = promoter(1000, [tataElement, inrElement, tataElement]);
      expect(p.getElementsByName('TATA')).toHaveLength(2);
      expect(p.getElementsByName('Inr')).toEqual([inrElement]);
      expect(p.getElementsByName('GC')).toEqual([]);
    });

    test('hasElement returns whether a named element is present', () => {
      const p = promoter(1000, [tataElement, inrElement]);
      expect(p.hasElement('TATA')).toBe(true);
      expect(p.hasElement('Inr')).toBe(true);
      expect(p.hasElement('GC')).toBe(false);
    });

    test('getElementPosition returns TSS + element.position', () => {
      const p = promoter(1000, [tataElement, inrElement, dpeElement]);
      expect(p.getElementPosition(tataElement)).toBe(975);
      expect(p.getElementPosition(inrElement)).toBe(1000);
      expect(p.getElementPosition(dpeElement)).toBe(1030);
    });

    test('getElementsByPosition sorts ascending by position', () => {
      const p = promoter(1000, [dpeElement, tataElement, inrElement]);
      const sorted = p.getElementsByPosition();
      expect(sorted).toHaveLength(3);
      expect(sorted[0]).toBe(tataElement);
      expect(sorted[1]).toBe(inrElement);
      expect(sorted[2]).toBe(dpeElement);
    });
  });

  describe('getStrengthScore', () => {
    test('returns 0 for an empty promoter', () => {
      expect(promoter(1000, []).getStrengthScore()).toBe(0);
    });

    test('sums per-element score weights for a single element', () => {
      expect(promoter(1000, [tataElement]).getStrengthScore()).toBe(10);
    });

    test('adds the synergy multiplier when more than one element is present', () => {
      const p = promoter(1000, [inrElement, dpeElement]);
      expect(p.getStrengthScore()).toBe(8 + 6 + 2 * PROMOTER_SYNERGY_MULTIPLIER);
    });

    test('respects per-element score weights for strong promoters', () => {
      const gcElement = element('GC', 'GGGCGG', -70, 4);
      const p = promoter(1000, [tataElement, caatElement, gcElement]);
      expect(p.getStrengthScore()).toBe(10 + 5 + 4 + 3 * PROMOTER_SYNERGY_MULTIPLIER);
    });

    test('treats unknown elements with no score weight as contributing 0', () => {
      const unknown = element('Unknown', 'NNNN', 0, 0);
      expect(promoter(1000, [unknown]).getStrengthScore()).toBe(0);
    });
  });

  describe('toString', () => {
    test('renders without a name', () => {
      const p = promoter(1000, [tataElement, inrElement]);
      expect(p.toString()).toBe('Promoter at TSS=1000 with elements: [TATA, Inr]');
    });

    test('renders with a name', () => {
      const p = promoter(1000, [tataElement], 'beta-globin');
      expect(p.toString()).toBe('Promoter (beta-globin) at TSS=1000 with elements: [TATA]');
    });

    test('renders with no elements', () => {
      const p = promoter(1000, [], 'empty');
      expect(p.toString()).toBe('Promoter (empty) at TSS=1000 with elements: []');
    });
  });
});
