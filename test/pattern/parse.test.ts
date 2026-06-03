import { parseNucleotidePattern, parseNucleotidePatternSymbol } from '../../src/pattern';
import { NucleotidePattern } from '../../src/pattern/NucleotidePattern';
import { NucleotidePatternSymbol } from '../../src/pattern/NucleotidePatternSymbol';

describe('parseNucleotidePattern', () => {
  test('returns success carrying a NucleotidePattern for valid input', () => {
    const result = parseNucleotidePattern('TATAWAR');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeInstanceOf(NucleotidePattern);
      expect(result.data.pattern).toBe('TATAWAR');
    }
  });

  test('accepts regex quantifiers and character classes', () => {
    const result = parseNucleotidePattern('ATGN{3}GCC');
    expect(result.success).toBe(true);
  });

  test('returns empty-pattern failure for empty input', () => {
    const result = parseNucleotidePattern('');
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error).toEqual({ kind: 'pattern/empty-pattern' });
    }
  });

  test('returns invalid-iupac-character failure with offending character and index', () => {
    const result = parseNucleotidePattern('TATAX');
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('pattern/invalid-iupac-character');
      if (result.error.kind === 'pattern/invalid-iupac-character') {
        expect(result.error.character).toBe('X');
        expect(result.error.index).toBe(4);
      }
    }
  });

  test('reports the first invalid character, not all of them', () => {
    const result = parseNucleotidePattern('AXY');
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'pattern/invalid-iupac-character') {
      expect(result.error.character).toBe('X');
      expect(result.error.index).toBe(1);
    }
  });

  test('returns invalid-regex-construction for patterns whose regex is malformed', () => {
    // 'A[' has only IUPAC alpha chars but compiles to an unterminated character class
    const result = parseNucleotidePattern('A[');
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('pattern/invalid-regex-construction');
      if (result.error.kind === 'pattern/invalid-regex-construction') {
        expect(result.error.pattern).toBe('A[');
        expect(typeof result.error.cause).toBe('string');
      }
    }
  });
});

describe('parseNucleotidePatternSymbol', () => {
  test('returns success for every IUPAC symbol', () => {
    for (const symbol of [
      'A',
      'T',
      'C',
      'G',
      'U',
      'R',
      'Y',
      'K',
      'M',
      'S',
      'W',
      'B',
      'V',
      'D',
      'H',
      'N',
    ]) {
      const result = parseNucleotidePatternSymbol(symbol);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(NucleotidePatternSymbol);
        expect(result.data.symbol).toBe(symbol);
      }
    }
  });

  test('normalizes lowercase input', () => {
    const result = parseNucleotidePatternSymbol('w');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.symbol).toBe('W');
    }
  });

  test('returns empty-symbol failure for empty input', () => {
    const result = parseNucleotidePatternSymbol('');
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error).toEqual({ kind: 'pattern/empty-symbol' });
    }
  });

  test('returns invalid-iupac-symbol failure for non-IUPAC input', () => {
    const result = parseNucleotidePatternSymbol('Z');
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('pattern/invalid-iupac-symbol');
      if (result.error.kind === 'pattern/invalid-iupac-symbol') {
        expect(result.error.symbol).toBe('Z');
      }
    }
  });

  test('rejects multi-character input as invalid symbol', () => {
    const result = parseNucleotidePatternSymbol('AT');
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('pattern/invalid-iupac-symbol');
    }
  });
});
