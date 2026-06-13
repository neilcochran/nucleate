import {
  DEFAULT_POLY_A_TAIL_LENGTH,
  MIN_POLY_A_DETECTION_LENGTH,
  MAX_POLY_A_TAIL_LENGTH,
  POLYA_SIGNALS,
  POLYA_SIGNAL_OFFSET,
  CANONICAL_POLYA_SIGNAL_DNA,
} from '../../src/polyadenylation';

/**
 * Validates polyadenylation biological constants against known scientific literature.
 *
 * References:
 * - Weill et al. (2012) Genome Research, "Translational control by changes in poly(A) tail length"
 * - Beaudoing et al. (2000) Genome Research, "Patterns of variant polyadenylation signal usage"
 * - Tian et al. (2005) Nucleic Acids Research, "A large-scale analysis of mRNA polyadenylation"
 */
describe('Polyadenylation biology constants', () => {
  describe('Poly-A tail behaviour', () => {
    test('DEFAULT_POLY_A_TAIL_LENGTH matches mammalian mRNA', () => {
      expect(DEFAULT_POLY_A_TAIL_LENGTH).toBe(200);
      expect(DEFAULT_POLY_A_TAIL_LENGTH).toBeGreaterThanOrEqual(150);
      expect(DEFAULT_POLY_A_TAIL_LENGTH).toBeLessThanOrEqual(300);
    });

    test('MIN_POLY_A_DETECTION_LENGTH distinguishes from random A-runs', () => {
      expect(MIN_POLY_A_DETECTION_LENGTH).toBe(10);
    });

    test('MAX_POLY_A_TAIL_LENGTH is bounded', () => {
      expect(MAX_POLY_A_TAIL_LENGTH).toBe(1000);
      expect(MAX_POLY_A_TAIL_LENGTH).toBeGreaterThan(DEFAULT_POLY_A_TAIL_LENGTH);
    });
  });

  describe('Polyadenylation signal strengths', () => {
    test('AAUAAA is the strongest canonical signal', () => {
      expect(POLYA_SIGNALS.AAUAAA).toBe(100);
      Object.entries(POLYA_SIGNALS).forEach(([signal, strength]) => {
        if (signal !== 'AAUAAA') {
          expect(strength).toBeLessThan(POLYA_SIGNALS.AAUAAA);
        }
      });
    });

    test('AUUAAA is the strongest variant', () => {
      expect(POLYA_SIGNALS.AUUAAA).toBe(80);
      const otherSignals = Object.entries(POLYA_SIGNALS).filter(
        ([signal]) => signal !== 'AAUAAA' && signal !== 'AUUAAA',
      );
      otherSignals.forEach(([, strength]) => {
        expect(strength).toBeLessThan(POLYA_SIGNALS.AUUAAA);
      });
    });

    test('signal strengths are biologically ordered', () => {
      expect(POLYA_SIGNALS.AAUAAA).toBeGreaterThan(POLYA_SIGNALS.AUUAAA);
      expect(POLYA_SIGNALS.AUUAAA).toBeGreaterThan(POLYA_SIGNALS.AGUAAA);
      expect(POLYA_SIGNALS.AGUAAA).toBeGreaterThan(POLYA_SIGNALS.AAUAUA);
    });

    test('CANONICAL_POLYA_SIGNAL_DNA transcribes to AAUAAA', () => {
      expect(CANONICAL_POLYA_SIGNAL_DNA).toBe('AATAAA');
      expect(CANONICAL_POLYA_SIGNAL_DNA.replace(/T/g, 'U')).toBe('AAUAAA');
    });

    test('POLYA_SIGNAL_OFFSET is the typical cleavage offset', () => {
      expect(POLYA_SIGNAL_OFFSET).toBe(6);
      expect(POLYA_SIGNAL_OFFSET).toBeGreaterThan(0);
    });
  });
});
