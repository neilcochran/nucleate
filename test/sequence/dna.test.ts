import { parseDNA } from '../../src/sequence';
import { DNA } from '../../src/sequence/DNA';

function dna(sequence: string): DNA {
  return parseDNA(sequence).unwrap();
}

describe('DNA', () => {
  describe('basic shape', () => {
    test('getSequence returns the validated upper-case sequence', () => {
      expect(dna('atcggatcctagg').getSequence()).toBe('ATCGGATCCTAGG');
    });

    test('getSequence is stable across calls', () => {
      const sequence = dna('ATCG');
      expect(sequence.getSequence()).toBe('ATCG');
      expect(sequence.getSequence()).toBe('ATCG');
    });
  });

  describe('equality', () => {
    test('two DNAs with the same sequence are equal', () => {
      expect(dna('ATCG').equals(dna('ATCG'))).toBe(true);
    });

    test('two DNAs with different sequences are not equal', () => {
      expect(dna('ATCG').equals(dna('GGCC'))).toBe(false);
    });
  });

  describe('search and substring methods', () => {
    const testDNA = dna('ATCGATCG');

    describe('length', () => {
      test('returns correct sequence length', () => {
        expect(testDNA.length()).toBe(8);
      });

      test('returns 1 for single nucleotide', () => {
        expect(dna('A').length()).toBe(1);
      });

      test('returns 4000 for a 1000-repeat ATCG sequence', () => {
        expect(dna('ATCG'.repeat(1000)).length()).toBe(4000);
      });
    });

    describe('contains', () => {
      test('finds existing subsequence', () => {
        expect(testDNA.contains(dna('TCG'))).toBe(true);
        expect(testDNA.contains(dna('ATCG'))).toBe(true);
      });

      test('returns false for missing subsequence', () => {
        expect(testDNA.contains(dna('AAA'))).toBe(false);
        expect(testDNA.contains(dna('TTT'))).toBe(false);
      });
    });

    describe('startsWith / endsWith', () => {
      test('startsWith accepts DNA', () => {
        expect(testDNA.startsWith(dna('ATC'))).toBe(true);
        expect(testDNA.startsWith(dna('GTC'))).toBe(false);
      });

      test('endsWith accepts DNA', () => {
        expect(testDNA.endsWith(dna('TCG'))).toBe(true);
        expect(testDNA.endsWith(dna('ATC'))).toBe(false);
      });
    });

    describe('indexOf', () => {
      test('returns first occurrence', () => {
        expect(testDNA.indexOf(dna('TCG'))).toBe(1);
        expect(testDNA.indexOf(dna('ATC'))).toBe(0);
      });

      test('respects start position', () => {
        expect(testDNA.indexOf(dna('TCG'), 2)).toBe(5);
      });

      test('returns -1 when missing', () => {
        expect(testDNA.indexOf(dna('AAA'))).toBe(-1);
      });
    });

    describe('getSubsequence', () => {
      test('extracts an inclusive-exclusive range', () => {
        const sub = testDNA.getSubsequence(2, 5);
        expect(sub).toBeInstanceOf(DNA);
        expect(sub.getSequence()).toBe('CGA');
      });

      test('extracts to end of sequence when end is omitted', () => {
        expect(testDNA.getSubsequence(5).getSequence()).toBe('TCG');
      });

      test('extracts entire sequence', () => {
        expect(testDNA.getSubsequence(0).getSequence()).toBe('ATCGATCG');
      });
    });
  });

  describe('complement transformations', () => {
    const testDNA = dna('ATCGATCG');

    test('getComplement returns a new DNA carrying the complement', () => {
      const complement = testDNA.getComplement();
      expect(complement).toBeInstanceOf(DNA);
      expect(complement.getSequence()).toBe('TAGCTAGC');
      expect(complement).not.toBe(testDNA);
    });

    test('getReverseComplement returns a new DNA carrying the reverse complement', () => {
      const rc = testDNA.getReverseComplement();
      expect(rc).toBeInstanceOf(DNA);
      expect(rc.getSequence()).toBe('CGATCGAT');
    });

    test('handles single bases', () => {
      expect(dna('A').getComplement().getSequence()).toBe('T');
      expect(dna('T').getComplement().getSequence()).toBe('A');
      expect(dna('C').getComplement().getSequence()).toBe('G');
      expect(dna('G').getComplement().getSequence()).toBe('C');
    });

    test('double complement is identity', () => {
      const round = testDNA.getComplement().getComplement();
      expect(round.equals(testDNA)).toBe(true);
    });

    test('palindromic restriction site equals its reverse complement', () => {
      const ecori = dna('GAATTC');
      expect(ecori.getReverseComplement().getSequence()).toBe('GAATTC');
    });

    test('chains with substring extraction', () => {
      const result = testDNA.getSubsequence(0, 4).getComplement().getReverseComplement();
      expect(result.getSequence()).toBe('GCTA');
    });

    test('preserves immutability of the original', () => {
      const original = dna('ATCG');
      original.getComplement();
      original.getReverseComplement();
      expect(original.getSequence()).toBe('ATCG');
    });
  });
});
