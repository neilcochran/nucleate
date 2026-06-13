import {
  NucleotidePatternSymbol,
  parseNucleotidePatternSymbol,
  NUCLEOTIDE_PATTERN_SYMBOLS,
} from '../../src/pattern';

function symbol(source: string): NucleotidePatternSymbol {
  return parseNucleotidePatternSymbol(source).unwrap();
}

describe('NucleotidePatternSymbol', () => {
  describe('basic shape', () => {
    test('exposes the validated symbol and its matching bases for every IUPAC code', () => {
      for (const [code, expectedBases] of Object.entries(NUCLEOTIDE_PATTERN_SYMBOLS)) {
        const instance = symbol(code);
        expect(instance.symbol).toBe(code);
        expect(instance.matchingBases).toEqual(expectedBases);
      }
    });

    test('normalizes lowercase input to uppercase', () => {
      expect(symbol('a').symbol).toBe('A');
      expect(symbol('w').symbol).toBe('W');
      expect(symbol('n').symbol).toBe('N');
    });
  });

  describe('matchingRegex', () => {
    test('A symbol regex matches a/A only', () => {
      const a = symbol('A');
      expect(a.matchingRegex.source).toBe('[Aa]');
      expect(a.matchingRegex.test('A')).toBe(true);
      expect(a.matchingRegex.test('a')).toBe(true);
      expect(a.matchingRegex.test('T')).toBe(false);
    });

    test('W ambiguity matches A or T (case-insensitive)', () => {
      const w = symbol('W');
      expect(w.matchingRegex.source).toBe('[AaTt]');
      expect(w.matchingRegex.test('A')).toBe(true);
      expect(w.matchingRegex.test('T')).toBe(true);
      expect(w.matchingRegex.test('t')).toBe(true);
      expect(w.matchingRegex.test('C')).toBe(false);
    });

    test('N ambiguity matches every concrete base', () => {
      const n = symbol('N');
      for (const base of ['A', 'C', 'G', 'T', 'a', 'c', 'g', 't']) {
        expect(n.matchingRegex.test(base)).toBe(true);
      }
    });

    test('B ambiguity excludes A', () => {
      const b = symbol('B');
      expect(b.matchingRegex.test('G')).toBe(true);
      expect(b.matchingRegex.test('T')).toBe(true);
      expect(b.matchingRegex.test('C')).toBe(true);
      expect(b.matchingRegex.test('A')).toBe(false);
    });
  });
});
