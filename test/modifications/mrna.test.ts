import { parseMRNA } from '../../src/modifications';
import { MRNA } from '../../src/modifications/MRNA';
import { requireCodingSequence } from '../utils/test-utils';

describe('MRNA', () => {
  describe('parseMRNA', () => {
    test('parses a minimal capped mRNA with no UTRs', () => {
      const result = parseMRNA('AUGAAACCCGGGUAA', 0, 15, true, 0);
      expect(result.success).toBe(true);
      if (result.success) {
        const mRNA = result.data;
        expect(mRNA).toBeInstanceOf(MRNA);
        expect(mRNA.sequence.sequence).toBe('AUGAAACCCGGGUAA');
        expect(requireCodingSequence(mRNA).sequence).toBe('AUGAAACCCGGGUAA');
        expect(mRNA.codingStart).toBe(0);
        expect(mRNA.codingEnd).toBe(15);
        expect(mRNA.fivePrimeCap).toBe(true);
        expect(mRNA.polyATailLength).toBe(0);
      }
    });

    test('defaults fivePrimeCap to true and polyATailLength to 0 when omitted', () => {
      const result = parseMRNA('AUGAAACCCGGG', 0, 12);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fivePrimeCap).toBe(true);
        expect(result.data.polyATailLength).toBe(0);
      }
    });

    test('computes codingSequence as substring at construction', () => {
      const result = parseMRNA('GGGAUGAAACCCGGGUAA', 3, 18);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(requireCodingSequence(result.data).sequence).toBe('AUGAAACCCGGGUAA');
      }
    });

    test('rejects invalid RNA characters with kind invalid-sequence', () => {
      const result = parseMRNA('AUGNNN', 0, 6);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('mrna/invalid-sequence');
        if (result.error.kind === 'mrna/invalid-sequence') {
          expect(result.error.cause.kind).toBe('rna/invalid-characters');
        }
      }
    });

    test('rejects empty sequence with kind invalid-sequence', () => {
      const result = parseMRNA('', 0, 0);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('mrna/invalid-sequence');
      }
    });

    test('rejects negative codingStart', () => {
      const result = parseMRNA('AUGAAACCCGGG', -1, 12);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'mrna/invalid-coding-boundaries') {
        expect(result.error.codingStart).toBe(-1);
      }
    });

    test('rejects codingEnd past sequence length', () => {
      const result = parseMRNA('AUGAAACCCGGG', 0, 15);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'mrna/invalid-coding-boundaries') {
        expect(result.error.codingEnd).toBe(15);
        expect(result.error.sequenceLength).toBe(12);
      }
    });

    test('rejects codingStart >= codingEnd', () => {
      const result = parseMRNA('AUGAAACCCGGG', 10, 5);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('mrna/invalid-coding-boundaries');
      }
    });

    test('rejects negative polyA tail length', () => {
      const result = parseMRNA('AUGAAACCCGGG', 0, 12, true, -1);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'mrna/invalid-polya-tail-length') {
        expect(result.error.polyATailLength).toBe(-1);
      }
    });

    test('rejects polyA tail length larger than the sequence', () => {
      const result = parseMRNA('AUGAAACCCGGG', 0, 12, true, 100);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('mrna/invalid-polya-tail-length');
      }
    });

    test('rejects non-integer codingStart', () => {
      const result = parseMRNA('AUGAAACCCGGG', 1.5, 12);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('mrna/invalid-coding-boundaries');
      }
    });

    test('constructs a non-coding mRNA when both boundaries are omitted', () => {
      const result = parseMRNA('AAACCCGGGUUU');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.codingStart).toBeUndefined();
        expect(result.data.codingEnd).toBeUndefined();
        expect(result.data.codingSequence).toBeUndefined();
      }
    });

    test('rejects supplying only codingStart with kind incomplete-coding-boundaries', () => {
      const result = parseMRNA('AUGAAACCCGGG', 0);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'mrna/incomplete-coding-boundaries') {
        expect(result.error.codingStart).toBe(0);
        expect(result.error.codingEnd).toBeUndefined();
      } else {
        throw new Error(`expected incomplete-coding-boundaries, got ${JSON.stringify(result)}`);
      }
    });

    test('rejects supplying only codingEnd with kind incomplete-coding-boundaries', () => {
      const result = parseMRNA('AUGAAACCCGGG', undefined, 12);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'mrna/incomplete-coding-boundaries') {
        expect(result.error.codingStart).toBeUndefined();
        expect(result.error.codingEnd).toBe(12);
      } else {
        throw new Error(`expected incomplete-coding-boundaries, got ${JSON.stringify(result)}`);
      }
    });
  });

  describe('MRNA fields and helpers', () => {
    test('getFivePrimeUTR returns the subsequence before codingStart as RNA', () => {
      const mRNA = parseMRNA('GGGCCCAUGAAACCCGGG', 6, 18, true, 0).unwrap();
      expect(mRNA.getFivePrimeUTR()?.sequence).toBe('GGGCCC');
    });

    test('getFivePrimeUTR is undefined when codingStart is 0', () => {
      const mRNA = parseMRNA('AUGAAACCCGGG', 0, 12, true, 0).unwrap();
      expect(mRNA.getFivePrimeUTR()).toBeUndefined();
    });

    test('getThreePrimeUTR returns the subsequence between codingEnd and the poly-A tail as RNA', () => {
      const mRNA = parseMRNA('AUGAAACCCGGGUAAGGGAAAAAAA', 0, 15, true, 7).unwrap();
      expect(mRNA.getThreePrimeUTR()?.sequence).toBe('GGG');
    });

    test('getThreePrimeUTR is undefined when coding ends right before the tail', () => {
      const mRNA = parseMRNA('AUGAAACCCGGGAAAAAAA', 0, 12, true, 7).unwrap();
      expect(mRNA.getThreePrimeUTR()).toBeUndefined();
    });

    test('toString summarizes length, coding boundaries, tail length, and cap', () => {
      const mRNA = parseMRNA('AUGAAACCCGGGAAAAA', 0, 12, true, 5).unwrap();
      expect(mRNA.toString()).toBe('MRNA(17nt, CDS 0-12, polyA 5, capped)');
    });

    test('toString omits cap suffix when uncapped', () => {
      const mRNA = parseMRNA('AUGAAACCCGGG', 0, 12, false, 0).unwrap();
      expect(mRNA.toString()).toBe('MRNA(12nt, CDS 0-12, polyA 0)');
    });

    test('getFivePrimeUTR and getThreePrimeUTR are undefined for a non-coding mRNA', () => {
      const mRNA = parseMRNA('AAACCCGGGUUU').unwrap();
      expect(mRNA.getFivePrimeUTR()).toBeUndefined();
      expect(mRNA.getThreePrimeUTR()).toBeUndefined();
    });

    test('toString reports no CDS for a non-coding mRNA', () => {
      const mRNA = parseMRNA('AAACCCGGGUUUAA', undefined, undefined, true, 2).unwrap();
      expect(mRNA.toString()).toBe('MRNA(14nt, no CDS, polyA 2, capped)');
    });
  });
});
