import {
  validateSpliceSites,
  findPotentialSpliceSites,
  SPLICE_CONSENSUS,
} from '../../src/splicing';
import { GenomicRegion } from '../../src/coordinates';
import { at } from '../utils/test-utils';

describe('splice-sites (DNA-side)', () => {
  describe('validateSpliceSites', () => {
    test('accepts canonical GT...AG introns', () => {
      const sequence = 'ATGGTAAAAGCCCGGG';
      const introns: GenomicRegion[] = [{ start: 3, end: 10 }]; // GTAAAAG
      const result = validateSpliceSites(sequence, introns);
      expect(result.success).toBe(true);
    });

    test('returns invalid-donor-site with position + found bases', () => {
      const sequence = 'ATGATCCCAGTTTAAA';
      const introns: GenomicRegion[] = [{ start: 3, end: 11 }]; // ATCCCAGT (AT donor)
      const result = validateSpliceSites(sequence, introns);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-donor-site') {
        expect(result.error.position).toBe(3);
        expect(result.error.found).toBe('AT');
        expect(result.error.intronIndex).toBe(0);
      }
    });

    test('returns invalid-acceptor-site for non-AG suffix', () => {
      const sequence = 'ATGGTCCCATTTTAAA';
      const introns: GenomicRegion[] = [{ start: 3, end: 11 }]; // GTCCCATT
      const result = validateSpliceSites(sequence, introns);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-acceptor-site') {
        expect(result.error.found).toBe('TT');
        expect(result.error.position).toBe(9);
      }
    });

    test('returns intron-too-short when the intron has fewer than 4 bases', () => {
      const sequence = 'ATGGTAAA';
      const introns: GenomicRegion[] = [{ start: 3, end: 5 }];
      const result = validateSpliceSites(sequence, introns);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'intron-too-short') {
        expect(result.error.length).toBe(2);
        expect(result.error.min).toBe(4);
      }
    });

    test('succeeds on the minimal 4-base GT-AG intron', () => {
      const sequence = 'ATGGTAG';
      const introns: GenomicRegion[] = [{ start: 3, end: 7 }];
      expect(validateSpliceSites(sequence, introns).success).toBe(true);
    });

    test('succeeds with an empty intron list', () => {
      expect(validateSpliceSites('ATGCCC', []).success).toBe(true);
    });

    test('reports the first failing rule (donor) when multiple are invalid', () => {
      const sequence = 'ATGATCCCATTTTAAA';
      const introns: GenomicRegion[] = [{ start: 3, end: 11 }]; // ATCCCATT, both invalid
      const result = validateSpliceSites(sequence, introns);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-donor-site');
      }
    });
  });

  describe('findPotentialSpliceSites', () => {
    test('finds a single GT...AG candidate', () => {
      const candidates = findPotentialSpliceSites('ATGGTCCCAGTTTAAA');
      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toEqual({
        start: 3,
        end: 10,
        name: 'potential_intron_3_10',
      });
    });

    test('respects maxIntronLength', () => {
      const sequence =
        SPLICE_CONSENSUS.dna.donor + 'C'.repeat(1000) + SPLICE_CONSENSUS.dna.acceptor;
      expect(findPotentialSpliceSites(sequence, 4, 100)).toHaveLength(0);
    });

    test('respects minIntronLength', () => {
      // 'GTAG' is exactly 4 bases - accepted when min is 4
      expect(findPotentialSpliceSites('GTAG', 4)).toHaveLength(1);
      // Rejected when min is 5
      expect(findPotentialSpliceSites('GTAG', 5)).toHaveLength(0);
    });

    test('returns empty when no GT-AG pairs exist', () => {
      expect(findPotentialSpliceSites('ATCCCCTTTAAA')).toHaveLength(0);
    });

    test('sorts results by start position', () => {
      const candidates = findPotentialSpliceSites('AGGTCCCAGGTAAAAGTTAG');
      for (let i = 1; i < candidates.length; i++) {
        expect(at(candidates, i).start).toBeGreaterThanOrEqual(at(candidates, i - 1).start);
      }
    });
  });
});
