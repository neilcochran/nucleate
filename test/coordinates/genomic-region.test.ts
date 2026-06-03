import {
  GenomicRegion,
  validateGenomicRegion,
  regionsOverlap,
  findFirstOverlap,
  validateNonOverlappingRegions,
  deriveIntronsFromExons,
} from '../../src/coordinates';
import { describeError } from '../../src';

describe('GenomicRegion utilities', () => {
  describe('validateGenomicRegion', () => {
    test('validates correct region', () => {
      const region: GenomicRegion = { start: 0, end: 10 };
      expect(validateGenomicRegion(region).success).toBe(true);
    });

    test('validates region with name', () => {
      const region: GenomicRegion = { start: 5, end: 15, name: 'exon1' };
      expect(validateGenomicRegion(region).success).toBe(true);
    });

    test('rejects region where start equals end with start-not-before-end', () => {
      const region: GenomicRegion = { start: 5, end: 5 };
      const result = validateGenomicRegion(region);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('region/start-not-before-end');
      }
    });

    test('rejects region where start > end with start-not-before-end', () => {
      const region: GenomicRegion = { start: 10, end: 5 };
      const result = validateGenomicRegion(region);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'region/start-not-before-end') {
        expect(result.error.start).toBe(10);
        expect(result.error.end).toBe(5);
      }
    });

    test('rejects region with negative start', () => {
      const region: GenomicRegion = { start: -1, end: 10 };
      const result = validateGenomicRegion(region);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'region/negative-start') {
        expect(result.error.start).toBe(-1);
      }
    });

    test('rejects region with negative end', () => {
      const region: GenomicRegion = { start: 0, end: -5 };
      const result = validateGenomicRegion(region);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'region/negative-end') {
        expect(result.error.end).toBe(-5);
      }
    });

    test('validates zero-start region', () => {
      const region: GenomicRegion = { start: 0, end: 1 };
      expect(validateGenomicRegion(region).success).toBe(true);
    });

    test('describeRegionError renders each variant', () => {
      expect(describeError({ kind: 'region/negative-start', start: -1 })).toContain('-1');
      expect(describeError({ kind: 'region/negative-end', end: -2 })).toContain('-2');
      expect(describeError({ kind: 'region/start-not-before-end', start: 10, end: 5 })).toContain(
        '10',
      );
    });
  });

  describe('regionsOverlap', () => {
    test('detects overlapping regions', () => {
      const region1: GenomicRegion = { start: 0, end: 10 };
      const region2: GenomicRegion = { start: 5, end: 15 };
      expect(regionsOverlap(region1, region2)).toBe(true);
    });

    test('detects overlapping regions (reverse order)', () => {
      const region1: GenomicRegion = { start: 5, end: 15 };
      const region2: GenomicRegion = { start: 0, end: 10 };
      expect(regionsOverlap(region1, region2)).toBe(true);
    });

    test('detects adjacent non-overlapping regions', () => {
      const region1: GenomicRegion = { start: 0, end: 10 };
      const region2: GenomicRegion = { start: 10, end: 20 };
      expect(regionsOverlap(region1, region2)).toBe(false);
    });

    test('detects separated regions', () => {
      const region1: GenomicRegion = { start: 0, end: 5 };
      const region2: GenomicRegion = { start: 10, end: 15 };
      expect(regionsOverlap(region1, region2)).toBe(false);
    });

    test('detects fully contained region', () => {
      const region1: GenomicRegion = { start: 0, end: 20 };
      const region2: GenomicRegion = { start: 5, end: 15 };
      expect(regionsOverlap(region1, region2)).toBe(true);
    });

    test('detects identical regions', () => {
      const region1: GenomicRegion = { start: 5, end: 15 };
      const region2: GenomicRegion = { start: 5, end: 15 };
      expect(regionsOverlap(region1, region2)).toBe(true);
    });

    test('detects single-base overlap', () => {
      const region1: GenomicRegion = { start: 0, end: 6 };
      const region2: GenomicRegion = { start: 5, end: 10 };
      expect(regionsOverlap(region1, region2)).toBe(true);
    });
  });

  describe('findFirstOverlap', () => {
    test('returns undefined for empty and single-region inputs', () => {
      expect(findFirstOverlap([])).toBeUndefined();
      expect(findFirstOverlap([{ start: 0, end: 10 }])).toBeUndefined();
    });

    test('returns undefined when regions are non-overlapping', () => {
      const regions: GenomicRegion[] = [
        { start: 0, end: 5 },
        { start: 10, end: 15 },
        { start: 20, end: 25 },
      ];
      expect(findFirstOverlap(regions)).toBeUndefined();
    });

    test('treats touching boundaries as non-overlapping', () => {
      const regions: GenomicRegion[] = [
        { start: 0, end: 5 },
        { start: 5, end: 10 },
      ];
      expect(findFirstOverlap(regions)).toBeUndefined();
    });

    test('reports the first overlapping pair ordered by start, with original indices', () => {
      const regions: GenomicRegion[] = [
        { start: 0, end: 50 },
        { start: 40, end: 90 },
        { start: 100, end: 150 },
      ];
      expect(findFirstOverlap(regions)).toEqual({ indices: [0, 1], at: 40 });
    });

    test('preserves original indices when the input is unsorted', () => {
      const regions: GenomicRegion[] = [
        { start: 10, end: 20 },
        { start: 0, end: 15 }, // overlaps the first once sorted by start
        { start: 25, end: 30 },
      ];
      // Earlier-starting region (index 1) reported first; later-starting (index 0) at its start.
      expect(findFirstOverlap(regions)).toEqual({ indices: [1, 0], at: 10 });
    });
  });

  describe('validateNonOverlappingRegions', () => {
    test('validates empty array', () => {
      expect(validateNonOverlappingRegions([])).toBe(true);
    });

    test('validates single region', () => {
      const regions: GenomicRegion[] = [{ start: 0, end: 10 }];
      expect(validateNonOverlappingRegions(regions)).toBe(true);
    });

    test('validates non-overlapping regions', () => {
      const regions: GenomicRegion[] = [
        { start: 0, end: 5 },
        { start: 10, end: 15 },
        { start: 20, end: 25 },
      ];
      expect(validateNonOverlappingRegions(regions)).toBe(true);
    });

    test('validates adjacent regions', () => {
      const regions: GenomicRegion[] = [
        { start: 0, end: 5 },
        { start: 5, end: 10 },
        { start: 10, end: 15 },
      ];
      expect(validateNonOverlappingRegions(regions)).toBe(true);
    });

    test('rejects overlapping regions', () => {
      const regions: GenomicRegion[] = [
        { start: 0, end: 10 },
        { start: 5, end: 15 },
      ];
      expect(validateNonOverlappingRegions(regions)).toBe(false);
    });

    test('rejects overlapping regions in unsorted order', () => {
      const regions: GenomicRegion[] = [
        { start: 10, end: 20 },
        { start: 0, end: 15 }, // Overlaps with first when sorted
        { start: 25, end: 30 },
      ];
      expect(validateNonOverlappingRegions(regions)).toBe(false);
    });

    test('validates regions provided in reverse order', () => {
      const regions: GenomicRegion[] = [
        { start: 20, end: 25 },
        { start: 10, end: 15 },
        { start: 0, end: 5 },
      ];
      expect(validateNonOverlappingRegions(regions)).toBe(true);
    });

    test('handles complex non-overlapping arrangement', () => {
      const regions: GenomicRegion[] = [
        { start: 15, end: 20 },
        { start: 0, end: 3 },
        { start: 25, end: 30 },
        { start: 5, end: 10 },
      ];
      expect(validateNonOverlappingRegions(regions)).toBe(true);
    });

    test('detects overlapping in middle of complex arrangement', () => {
      const regions: GenomicRegion[] = [
        { start: 15, end: 20 },
        { start: 0, end: 3 },
        { start: 25, end: 30 },
        { start: 18, end: 22 }, // Overlaps with first region
        { start: 5, end: 10 },
      ];
      expect(validateNonOverlappingRegions(regions)).toBe(false);
    });
  });

  describe('deriveIntronsFromExons', () => {
    test('returns no introns when fewer than two exons are supplied', () => {
      expect(deriveIntronsFromExons([])).toEqual([]);
      expect(deriveIntronsFromExons([{ start: 0, end: 10 }])).toEqual([]);
    });

    test('emits one intron per positive gap between sorted exons', () => {
      const exons: GenomicRegion[] = [
        { start: 0, end: 6 },
        { start: 12, end: 18 },
        { start: 24, end: 30 },
      ];
      expect(deriveIntronsFromExons(exons)).toEqual([
        { start: 6, end: 12, name: undefined },
        { start: 18, end: 24, name: undefined },
      ]);
    });

    test('sorts unsorted input by start before emitting introns', () => {
      const exons: GenomicRegion[] = [
        { start: 24, end: 30 },
        { start: 0, end: 6 },
        { start: 12, end: 18 },
      ];
      expect(deriveIntronsFromExons(exons)).toEqual([
        { start: 6, end: 12, name: undefined },
        { start: 18, end: 24, name: undefined },
      ]);
    });

    test('skips zero-length gaps where adjacent exons touch', () => {
      const exons: GenomicRegion[] = [
        { start: 0, end: 10 },
        { start: 10, end: 20 },
      ];
      expect(deriveIntronsFromExons(exons)).toEqual([]);
    });

    test('leaves the intron name field undefined', () => {
      const exons: GenomicRegion[] = [
        { start: 0, end: 6, name: 'exon1' },
        { start: 12, end: 18, name: 'exon2' },
      ];
      const introns = deriveIntronsFromExons(exons);
      expect(introns).toHaveLength(1);
      expect(introns[0]?.name).toBeUndefined();
    });
  });
});
