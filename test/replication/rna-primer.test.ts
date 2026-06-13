import { parseRNAPrimer } from '../../src/replication';
import { RNAPrimer, unsafeRNAPrimerFromString } from '../../src/replication/RNAPrimer';
import { parseRNA } from '../../src/sequence';

describe('RNAPrimer', () => {
  describe('parseRNAPrimer', () => {
    test('accepts a valid 5-nt primer at a non-negative position', () => {
      const result = parseRNAPrimer('AUCGU', 0);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sequence.sequence).toBe('AUCGU');
        expect(result.data.position).toBe(0);
        expect(result.data.length()).toBe(5);
      }
    });

    test('accepts the minimum biologically-acceptable length (3 nt)', () => {
      const result = parseRNAPrimer('AUC', 0);
      expect(result.success).toBe(true);
    });

    test('accepts the maximum biologically-acceptable length (10 nt)', () => {
      const result = parseRNAPrimer('AUCGUACGAU', 0);
      expect(result.success).toBe(true);
    });

    test('rejects sequences shorter than 3 nt', () => {
      const result = parseRNAPrimer('AU', 0);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('primer/invalid-length');
        if (result.error.kind === 'primer/invalid-length') {
          expect(result.error.length).toBe(2);
          expect(result.error.min).toBe(3);
          expect(result.error.max).toBe(10);
        }
      }
    });

    test('rejects sequences longer than 10 nt', () => {
      const result = parseRNAPrimer('AUCGUACGAUC', 0);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'primer/invalid-length') {
        expect(result.error.length).toBe(11);
      }
    });

    test('rejects negative positions', () => {
      const result = parseRNAPrimer('AUCG', -1);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('primer/invalid-position');
        if (result.error.kind === 'primer/invalid-position') {
          expect(result.error.position).toBe(-1);
        }
      }
    });

    test('rejects non-integer positions', () => {
      const result = parseRNAPrimer('AUCG', 1.5);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'primer/invalid-position') {
        expect(result.error.position).toBe(1.5);
      }
    });

    test('rejects sequences with invalid RNA characters', () => {
      const result = parseRNAPrimer('ATCG', 0);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('primer/invalid-sequence');
      }
    });

    test('rejects empty sequences with invalid-sequence (not invalid-length)', () => {
      const result = parseRNAPrimer('', 0);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('primer/invalid-sequence');
        if (result.error.kind === 'primer/invalid-sequence') {
          expect(result.error.cause.kind).toBe('rna/empty-sequence');
        }
      }
    });
  });

  describe('internal unsafe factories', () => {
    test('new RNAPrimer bypasses length validation', () => {
      const rna = parseRNA('A').unwrap();
      const primer = new RNAPrimer(rna, 5);
      expect(primer.sequence.sequence).toBe('A');
      expect(primer.position).toBe(5);
      expect(primer.length()).toBe(1);
    });

    test('unsafeRNAPrimerFromString bypasses RNA-alphabet parsing', () => {
      const primer = unsafeRNAPrimerFromString('AUCG', 12);
      expect(primer.sequence.sequence).toBe('AUCG');
      expect(primer.position).toBe(12);
    });
  });
});
