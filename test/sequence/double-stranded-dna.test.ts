import {
  doubleStrandedDNA,
  parseDNA,
  parseDoubleStrandedDNA,
  describeDoubleStrandedError,
} from '../../src/sequence';
import { unsafeDoubleStrandedDNA } from '../../src/sequence/DoubleStrandedDNA';

describe('DoubleStrandedDNA', () => {
  describe('doubleStrandedDNA (infallible factory)', () => {
    test('builds a duplex with the reverse-complement of the forward strand', () => {
      const forward = parseDNA('ATCG').unwrap();
      const duplex = doubleStrandedDNA(forward);
      expect(duplex.forward.sequence).toBe('ATCG');
      expect(duplex.reverse.sequence).toBe('CGAT');
    });

    test('preserves forward instance identity', () => {
      const forward = parseDNA('GGCCAATT').unwrap();
      const duplex = doubleStrandedDNA(forward);
      expect(duplex.forward).toBe(forward);
    });

    test('length() returns base-pair count', () => {
      const duplex = doubleStrandedDNA(parseDNA('AAAAATTTTT').unwrap());
      expect(duplex.length()).toBe(10);
    });

    test('palindromic sequence yields equal forward and reverse strands', () => {
      const duplex = doubleStrandedDNA(parseDNA('GAATTC').unwrap());
      expect(duplex.forward.sequence).toBe('GAATTC');
      expect(duplex.reverse.sequence).toBe('GAATTC');
    });
  });

  describe('parseDoubleStrandedDNA', () => {
    test('accepts a valid complementary pair', () => {
      const forward = parseDNA('ATCG').unwrap();
      const reverse = parseDNA('CGAT').unwrap();
      const result = parseDoubleStrandedDNA(forward, reverse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forward.sequence).toBe('ATCG');
        expect(result.data.reverse.sequence).toBe('CGAT');
      }
    });

    test('rejects mismatched lengths', () => {
      const forward = parseDNA('ATCG').unwrap();
      const reverse = parseDNA('CGA').unwrap();
      const result = parseDoubleStrandedDNA(forward, reverse);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('length-mismatch');
        if (result.error.kind === 'length-mismatch') {
          expect(result.error.forwardLength).toBe(4);
          expect(result.error.reverseLength).toBe(3);
        }
      }
    });

    test('rejects same-length but non-complementary strands', () => {
      const forward = parseDNA('ATCG').unwrap();
      const reverse = parseDNA('ATCG').unwrap();
      const result = parseDoubleStrandedDNA(forward, reverse);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('not-complementary');
        if (result.error.kind === 'not-complementary') {
          expect(result.error.firstMismatchAt).toBe(0);
          expect(result.error.expected).toBe('C');
          expect(result.error.actual).toBe('A');
        }
      }
    });

    test('reports the first mismatch position on a mostly-correct reverse strand', () => {
      const forward = parseDNA('AAAA').unwrap();
      const reverse = parseDNA('TTGT').unwrap();
      const result = parseDoubleStrandedDNA(forward, reverse);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'not-complementary') {
        expect(result.error.firstMismatchAt).toBe(2);
        expect(result.error.expected).toBe('T');
        expect(result.error.actual).toBe('G');
      }
    });

    test('accepts a palindrome (forward equals reverse)', () => {
      const seq = parseDNA('GAATTC').unwrap();
      const result = parseDoubleStrandedDNA(seq, parseDNA('GAATTC').unwrap());
      expect(result.success).toBe(true);
    });
  });

  describe('describeDoubleStrandedError', () => {
    test('renders length-mismatch human-readably', () => {
      const message = describeDoubleStrandedError({
        kind: 'length-mismatch',
        forwardLength: 5,
        reverseLength: 3,
      });
      expect(message).toContain('5');
      expect(message).toContain('3');
    });

    test('renders not-complementary human-readably', () => {
      const message = describeDoubleStrandedError({
        kind: 'not-complementary',
        firstMismatchAt: 7,
        expected: 'A',
        actual: 'C',
      });
      expect(message).toContain('7');
      expect(message).toContain("'A'");
      expect(message).toContain("'C'");
    });
  });

  describe('constructor', () => {
    test('the internal unsafe factory bypasses validation', () => {
      const forward = parseDNA('ATCG').unwrap();
      const wrongReverse = parseDNA('AAAA').unwrap();
      const duplex = unsafeDoubleStrandedDNA(forward, wrongReverse);
      expect(duplex.forward.sequence).toBe('ATCG');
      expect(duplex.reverse.sequence).toBe('AAAA');
    });
  });

  describe('equals', () => {
    test('returns true for duplexes with matching strands', () => {
      const a = doubleStrandedDNA(parseDNA('ATCG').unwrap());
      const b = doubleStrandedDNA(parseDNA('ATCG').unwrap());
      expect(a.equals(b)).toBe(true);
    });

    test('returns false for duplexes with differing forward strands', () => {
      const a = doubleStrandedDNA(parseDNA('ATCG').unwrap());
      const b = doubleStrandedDNA(parseDNA('TTCG').unwrap());
      expect(a.equals(b)).toBe(false);
    });
  });
});
