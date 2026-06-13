import { validateExons, MIN_INTRON_SIZE } from '../../src/gene';
import type { GenomicRegion } from '../../src/coordinates';

describe('validateExons', () => {
  test('validates a single exon successfully', () => {
    const exons: GenomicRegion[] = [{ start: 0, end: 100, name: 'exon1' }];
    const result = validateExons(exons, 200);
    expect(result.success).toBe(true);
  });

  test('validates multiple non-overlapping exons', () => {
    const exons: GenomicRegion[] = [
      { start: 0, end: 50, name: 'exon1' },
      { start: 100, end: 150, name: 'exon2' },
      { start: 200, end: 250, name: 'exon3' },
    ];
    const result = validateExons(exons, 300);
    expect(result.success).toBe(true);
  });

  test('rejects empty exon list with kind=no-exons', () => {
    const result = validateExons([], 100);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('gene/no-exons');
    }
  });

  test('detects overlapping exons with kind=exons-overlap', () => {
    const exons: GenomicRegion[] = [
      { start: 0, end: 50, name: 'exon1' },
      { start: 40, end: 90, name: 'exon2' },
      { start: 100, end: 150, name: 'exon3' },
    ];
    const result = validateExons(exons, 200);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'gene/exons-overlap') {
      expect(result.error.at).toBe(40);
      // First overlapping pair, ordered by gene start position.
      expect(result.error.indices).toEqual([0, 1]);
    } else {
      throw new Error(`expected exons-overlap, got ${JSON.stringify(result)}`);
    }
  });

  test('rejects exons extending beyond sequence length', () => {
    const exons: GenomicRegion[] = [
      { start: 0, end: 50 },
      { start: 100, end: 250 },
    ];
    const result = validateExons(exons, 200);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('gene/exon-out-of-bounds');
    }
  });

  test('enforces minimum exon size constraint', () => {
    const exons: GenomicRegion[] = [
      { start: 0, end: 2 },
      { start: 50, end: 100 },
    ];
    const result = validateExons(exons, 150);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'gene/exon-too-small') {
      expect(result.error.length).toBe(2);
      expect(result.error.min).toBe(3);
    } else {
      throw new Error(`expected exon-too-small, got ${JSON.stringify(result)}`);
    }
  });

  test('enforces maximum exon size constraint', () => {
    const exons: GenomicRegion[] = [{ start: 0, end: 60000 }];
    const result = validateExons(exons, 70000);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'gene/exon-too-large') {
      expect(result.error.length).toBe(60000);
      expect(result.error.max).toBe(50000);
    } else {
      throw new Error(`expected exon-too-large, got ${JSON.stringify(result)}`);
    }
  });

  test('enforces minimum intron size constraint', () => {
    const exons: GenomicRegion[] = [
      { start: 0, end: 50 },
      { start: 65, end: 100 },
    ];
    const result = validateExons(exons, 150);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'gene/intron-too-small') {
      expect(result.error.length).toBe(15);
      expect(result.error.min).toBe(MIN_INTRON_SIZE);
    } else {
      throw new Error(`expected intron-too-small, got ${JSON.stringify(result)}`);
    }
  });

  test('enforces maximum intron size constraint', () => {
    const exons: GenomicRegion[] = [
      { start: 0, end: 50 },
      { start: 3050100, end: 3050150 },
    ];
    const result = validateExons(exons, 3050200);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'gene/intron-too-large') {
      expect(result.error.max).toBe(3000000);
    } else {
      throw new Error(`expected intron-too-large, got ${JSON.stringify(result)}`);
    }
  });

  test('handles large numbers of exons efficiently', () => {
    const exons: GenomicRegion[] = [];
    for (let i = 0; i < 1000; i++) {
      exons.push({ start: i * 100, end: i * 100 + 50, name: `exon${i}` });
    }
    const startTime = performance.now();
    const result = validateExons(exons, 100000);
    const endTime = performance.now();
    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(100);
  });

  test('rejects invalid (negative-start) coordinates', () => {
    const exons: GenomicRegion[] = [{ start: -5, end: 50 }];
    const result = validateExons(exons, 100);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('gene/exon-invalid-coordinates');
    }
  });

  test('allows adjacent exons where intron length is exactly MIN_INTRON_SIZE', () => {
    const exons: GenomicRegion[] = [
      { start: 0, end: 50 },
      { start: 70, end: 120 },
      { start: 140, end: 190 },
    ];
    const result = validateExons(exons, 200);
    expect(result.success).toBe(true);
  });
});
