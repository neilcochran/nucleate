import { parseRNA } from '../../src/sequence';
import { RNA } from '../../src/sequence/RNA';

function rna(sequence: string): RNA {
  return parseRNA(sequence).unwrap();
}

describe('RNA', () => {
  describe('basic shape', () => {
    test('getSequence returns the validated upper-case sequence', () => {
      expect(rna('aucgaucgaucg').getSequence()).toBe('AUCGAUCGAUCG');
    });

    test('getSequence is stable across calls', () => {
      const sequence = rna('AUCG');
      expect(sequence.getSequence()).toBe('AUCG');
      expect(sequence.getSequence()).toBe('AUCG');
    });
  });

  describe('equality', () => {
    test('two RNAs with the same sequence are equal', () => {
      expect(rna('AUCG').equals(rna('AUCG'))).toBe(true);
    });

    test('two RNAs with different sequences are not equal', () => {
      expect(rna('AUCG').equals(rna('GGCC'))).toBe(false);
    });
  });

  describe('search and substring methods', () => {
    const testRNA = rna('AUCGAUCG');

    test('length returns correct length', () => {
      expect(testRNA.length()).toBe(8);
    });

    test('length returns 4000 for a 1000-repeat AUCG sequence', () => {
      expect(rna('AUCG'.repeat(1000)).length()).toBe(4000);
    });

    test('contains finds existing subsequence', () => {
      expect(testRNA.contains(rna('UCG'))).toBe(true);
      expect(testRNA.contains(rna('AAA'))).toBe(false);
    });

    test('startsWith and endsWith accept RNA', () => {
      expect(testRNA.startsWith(rna('AUC'))).toBe(true);
      expect(testRNA.endsWith(rna('UCG'))).toBe(true);
    });

    test('indexOf returns positions', () => {
      expect(testRNA.indexOf(rna('UCG'))).toBe(1);
      expect(testRNA.indexOf(rna('UCG'), 2)).toBe(5);
      expect(testRNA.indexOf(rna('AAA'))).toBe(-1);
    });

    test('getSubsequence extracts inclusive-exclusive range', () => {
      const sub = testRNA.getSubsequence(2, 5);
      expect(sub).toBeInstanceOf(RNA);
      expect(sub.getSequence()).toBe('CGA');
    });
  });

  describe('complement transformations', () => {
    const testRNA = rna('AUCGAUCG');

    test('getComplement returns a new RNA carrying the complement', () => {
      const complement = testRNA.getComplement();
      expect(complement).toBeInstanceOf(RNA);
      expect(complement.getSequence()).toBe('UAGCUAGC');
    });

    test('getReverseComplement returns a new RNA carrying the reverse complement', () => {
      const rc = testRNA.getReverseComplement();
      expect(rc).toBeInstanceOf(RNA);
      expect(rc.getSequence()).toBe('CGAUCGAU');
    });

    test('handles single bases', () => {
      expect(rna('A').getComplement().getSequence()).toBe('U');
      expect(rna('U').getComplement().getSequence()).toBe('A');
      expect(rna('C').getComplement().getSequence()).toBe('G');
      expect(rna('G').getComplement().getSequence()).toBe('C');
    });

    test('double complement is identity', () => {
      const round = testRNA.getComplement().getComplement();
      expect(round.equals(testRNA)).toBe(true);
    });
  });
});
