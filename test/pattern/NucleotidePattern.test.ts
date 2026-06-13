import {
  NucleotidePattern,
  parseNucleotidePattern,
  NUCLEOTIDE_PATTERN_SYMBOLS,
} from '../../src/pattern';
import { DNA, RNA, parseDNA, parseRNA } from '../../src/sequence';

function pattern(source: string): NucleotidePattern {
  return parseNucleotidePattern(source).unwrap();
}

function dna(sequence: string): DNA {
  return parseDNA(sequence).unwrap();
}

function rna(sequence: string): RNA {
  return parseRNA(sequence).unwrap();
}

describe('NucleotidePattern', () => {
  describe('basic shape', () => {
    test('stores the original pattern string verbatim', () => {
      expect(pattern('TATAWAR').pattern).toBe('TATAWAR');
    });

    test('accepts every IUPAC ambiguity symbol', () => {
      for (const symbol of Object.keys(NUCLEOTIDE_PATTERN_SYMBOLS)) {
        expect(pattern(symbol).pattern).toBe(symbol);
      }
    });
  });

  describe('matches', () => {
    test('matches a literal DNA pattern against an exact sequence', () => {
      const p = pattern('ATGC');
      expect(p.matches(dna('ATGC'))).toBe(true);
      expect(p.matches(dna('ATGA'))).toBe(false);
    });

    test('matches a literal RNA pattern against an exact sequence', () => {
      const p = pattern('AUGC');
      expect(p.matches(rna('AUGC'))).toBe(true);
      expect(p.matches(rna('AUGA'))).toBe(false);
    });

    test('matches anywhere within the sequence (substring match)', () => {
      const p = pattern('TATA');
      expect(p.matches(dna('GCATATAGC'))).toBe(true);
      expect(p.matches(dna('GCGCGCGC'))).toBe(false);
    });

    test('matches case-insensitively', () => {
      const p = pattern('ATGC');
      expect(p.matches(dna('atgc'))).toBe(true);
      expect(p.matches(dna('AtGc'))).toBe(true);
    });

    test('W ambiguity matches A or T', () => {
      const p = pattern('W');
      expect(p.matches(dna('A'))).toBe(true);
      expect(p.matches(dna('T'))).toBe(true);
      expect(p.matches(dna('C'))).toBe(false);
    });

    test('TATAWAR matches biological TATA box variants', () => {
      const p = pattern('TATAWAR');
      expect(p.matches(dna('TATAAAA'))).toBe(true);
      expect(p.matches(dna('TATATAG'))).toBe(true);
      expect(p.matches(dna('TATAAAC'))).toBe(false);
      expect(p.matches(dna('TATACAA'))).toBe(false);
    });

    test('repeated invocations are stateless (no g-flag leak)', () => {
      const p = pattern('GA');
      const sequence = dna('GAGA');
      expect(p.matches(sequence)).toBe(true);
      expect(p.matches(sequence)).toBe(true);
      expect(p.matches(sequence)).toBe(true);
    });
  });

  describe('findAll', () => {
    test('returns every match with start, end, and matched substring', () => {
      const p = pattern('GA');
      const matches = p.findAll(dna('ATGAGCGATC'));
      expect(matches).toEqual([
        { start: 2, end: 4, matched: 'GA' },
        { start: 6, end: 8, matched: 'GA' },
      ]);
    });

    test('returns frozen array', () => {
      const p = pattern('A');
      const matches = p.findAll(dna('AAAA'));
      expect(Object.isFrozen(matches)).toBe(true);
    });

    test('respects IUPAC ambiguity in the pattern', () => {
      const p = pattern('RY');
      const matches = p.findAll(dna('ATGAGCGATC'));
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]).toEqual({ start: 0, end: 2, matched: 'AT' });
    });

    test('returns empty array when no matches', () => {
      const p = pattern('TTT');
      expect(p.findAll(dna('AAACCCGGG'))).toEqual([]);
    });

    test('finds non-overlapping matches of repeating motif', () => {
      const p = pattern('AA');
      const matches = p.findAll(dna('AAAA'));
      expect(matches).toEqual([
        { start: 0, end: 2, matched: 'AA' },
        { start: 2, end: 4, matched: 'AA' },
      ]);
    });

    test('repeated invocations return consistent results', () => {
      const p = pattern('GA');
      const sequence = dna('GAGAGA');
      const first = p.findAll(sequence);
      const second = p.findAll(sequence);
      expect(first).toEqual(second);
    });
  });

  describe('findFirst', () => {
    test('returns the first match', () => {
      const p = pattern('GA');
      const match = p.findFirst(dna('ATGAGCGATC'));
      expect(match).toEqual({ start: 2, end: 4, matched: 'GA' });
    });

    test('returns undefined when no match', () => {
      const p = pattern('TTT');
      expect(p.findFirst(dna('AAACCCGGG'))).toBeUndefined();
    });

    test('respects IUPAC ambiguity', () => {
      const p = pattern('RY');
      const match = p.findFirst(dna('ATGAGCGATC'));
      expect(match).toBeDefined();
      expect(match?.start).toBe(0);
      expect(match?.matched).toBe('AT');
    });
  });

  describe('matchesEitherStrand', () => {
    test('matches the forward strand', () => {
      const p = pattern('GAATTC');
      expect(p.matchesEitherStrand(dna('GAATTC'))).toBe(true);
    });

    test('matches the reverse-complement strand of an asymmetric pattern', () => {
      const p = pattern('ATCG');
      expect(p.matches(dna('CGAT'))).toBe(false);
      expect(p.matchesEitherStrand(dna('CGAT'))).toBe(true);
    });

    test('palindromic restriction site matches itself on both strands', () => {
      const ecoRI = pattern('GAATTC');
      expect(ecoRI.matchesEitherStrand(dna('GAATTC'))).toBe(true);
    });

    test('returns false when neither strand matches', () => {
      const p = pattern('AAAA');
      expect(p.matchesEitherStrand(dna('CCCC'))).toBe(false);
    });

    test('handles IUPAC ambiguity in patterns', () => {
      // complement(R) = Y, complement(Y) = R. RY -> YR -> reversed -> RY (palindrome).
      const p = pattern('RY');
      expect(p.matchesEitherStrand(dna('AT'))).toBe(true);
    });

    test('returns false when the reverse-complement string is not a valid regex', () => {
      // Pattern 'A+' -> complement 'T+' -> reverse '+T' is malformed regex
      const p = pattern('A+');
      expect(p.matchesEitherStrand(dna('CCC'))).toBe(false);
    });
  });

  describe('complement', () => {
    test('complements literal bases', () => {
      expect(pattern('ATCG').complement().pattern).toBe('TAGC');
    });

    test('complements IUPAC ambiguity codes via base-set lookup', () => {
      expect(pattern('R').complement().pattern).toBe('Y');
      expect(pattern('Y').complement().pattern).toBe('R');
      expect(pattern('K').complement().pattern).toBe('M');
      expect(pattern('M').complement().pattern).toBe('K');
      expect(pattern('S').complement().pattern).toBe('S');
      expect(pattern('W').complement().pattern).toBe('W');
      expect(pattern('B').complement().pattern).toBe('V');
      expect(pattern('V').complement().pattern).toBe('B');
      expect(pattern('D').complement().pattern).toBe('H');
      expect(pattern('H').complement().pattern).toBe('D');
      expect(pattern('N').complement().pattern).toBe('N');
    });

    test('U complements to A (DNA-favoring convention)', () => {
      expect(pattern('U').complement().pattern).toBe('A');
    });

    test('preserves regex meta-characters', () => {
      expect(pattern('A{3}').complement().pattern).toBe('T{3}');
    });

    test('complemented pattern matches the complement sequence', () => {
      const original = pattern('ATCG');
      const complemented = original.complement();
      expect(complemented.matches(dna('TAGC'))).toBe(true);
      expect(original.matches(dna('TAGC'))).toBe(false);
    });
  });

  describe('reverseComplement', () => {
    test('reverse-complements a simple asymmetric pattern', () => {
      expect(pattern('ATCG').reverseComplement().pattern).toBe('CGAT');
    });

    test('palindromic patterns round-trip to themselves', () => {
      // EcoRI is palindromic: GAATTC -> complement CTTAAG -> reverse GAATTC
      expect(pattern('GAATTC').reverseComplement().pattern).toBe('GAATTC');
    });

    test('reverse-complements IUPAC ambiguity codes', () => {
      // RYK -> complement YRM -> reverse MRY
      expect(pattern('RYK').reverseComplement().pattern).toBe('MRY');
    });

    test('reverse-complemented pattern matches the reverse complement sequence', () => {
      const original = pattern('ATCG');
      const rc = original.reverseComplement();
      expect(rc.matches(dna('CGAT'))).toBe(true);
      expect(original.matches(dna('CGAT'))).toBe(false);
    });

    test('reverse-complement on simple literal patterns is involutive', () => {
      for (const source of ['A', 'T', 'CG', 'ATCG', 'GAATTC']) {
        const p = pattern(source);
        const doubleRC = p.reverseComplement().reverseComplement();
        expect(doubleRC.pattern).toBe(p.pattern);
      }
    });
  });

  describe('biological regression cases', () => {
    test('canonical poly-A signal AATAAA matches DNA termini', () => {
      const polyA = pattern('AATAAA');
      const sequence = dna('ATGAAACCCAATAAACCCGGGAAATAA');
      expect(polyA.matches(sequence)).toBe(true);
      const match = polyA.findFirst(sequence);
      expect(match?.start).toBe(9);
      expect(match?.matched).toBe('AATAAA');
    });

    test('EcoRI site is palindromic at both reverseComplement and matchesEitherStrand', () => {
      const ecoRI = pattern('GAATTC');
      expect(ecoRI.reverseComplement().pattern).toBe('GAATTC');
      expect(ecoRI.matchesEitherStrand(dna('GAATTC'))).toBe(true);
    });
  });
});
