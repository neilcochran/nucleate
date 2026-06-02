import { parseGene, Gene } from '../../src/gene';
import type { GeneError } from '../../src/gene';
import type { GenomicRegion } from '../../src/coordinates';
import { SIMPLE_TWO_EXON_GENE, THREE_EXON_GENE, SINGLE_EXON_GENE } from '../test-genes';

function unwrapGene(
  sequence: string,
  exons: GenomicRegion[],
  name?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  splicingProfile?: any,
): Gene {
  const result = parseGene(sequence, exons, name, splicingProfile);
  if (!result.success) {
    throw new Error(`parseGene unexpectedly failed: ${JSON.stringify(result.error)}`);
  }
  return result.data;
}

describe('Gene', () => {
  describe('parseGene success cases', () => {
    test('creates valid gene with single exon', () => {
      const sequence = 'ATGCCCGGG';
      const exons: GenomicRegion[] = [{ start: 0, end: 9 }];
      const gene = unwrapGene(sequence, exons);

      expect(gene.sequence.getSequence()).toBe(sequence);
      expect(gene.exons).toHaveLength(1);
      expect(gene.introns).toHaveLength(0);
      expect(gene.getMatureSequence().sequence).toBe(sequence);
    });

    test('creates valid gene with multiple exons and derived intron', () => {
      const sequence = 'ATGGTCCCAGTTTAAAGGGGGGGGGGGGGGGGGGGGCCCCCC';
      const exons: GenomicRegion[] = [
        { start: 0, end: 12, name: 'exon1' },
        { start: 32, end: 40, name: 'exon2' },
      ];
      const gene = unwrapGene(sequence, exons);

      expect(gene.exons).toHaveLength(2);
      expect(gene.introns).toHaveLength(1);
      expect(gene.introns[0]).toEqual({ start: 12, end: 32, name: 'intron1' });
    });

    test('creates valid gene with GT-AG splice sites', () => {
      const sequence = 'ATGGTCCCCCCCCCCCCCCCCCCCCAGTTTAAA';
      const exons: GenomicRegion[] = [
        { start: 0, end: 3 },
        { start: 27, end: 32 },
      ];
      const gene = unwrapGene(sequence, exons);

      expect(gene.getIntronSequence(0).sequence).toBe('GTCCCCCCCCCCCCCCCCCCCCAG');
    });

    test('handles multiple non-adjacent exons correctly', () => {
      const gene = unwrapGene(THREE_EXON_GENE.dnaSequence, [...THREE_EXON_GENE.exons]);

      expect(gene.exons).toHaveLength(3);
      expect(gene.introns).toHaveLength(2);
      expect(gene.getMatureSequence().sequence).toBe('ATGAAACCCGGGTAGAAA');
      expect(gene.introns[0]).toEqual({ start: 6, end: 27, name: 'intron1' });
      expect(gene.introns[1]).toEqual({ start: 33, end: 54, name: 'intron2' });
    });

    test('handles single exon gene (no introns)', () => {
      const gene = unwrapGene(SINGLE_EXON_GENE.dnaSequence, [...SINGLE_EXON_GENE.exons]);

      expect(gene.exons).toHaveLength(1);
      expect(gene.introns).toHaveLength(0);
      expect(gene.getMatureSequence().sequence).toBe('ATGAAACCCGGGTAG');
    });

    test('exons can be provided in any order; introns derive from sorted positions', () => {
      const exons: GenomicRegion[] = [
        { start: 26, end: 34, name: 'exon2' },
        { start: 0, end: 6, name: 'exon1' },
      ];
      const gene = unwrapGene(SIMPLE_TWO_EXON_GENE.dnaSequence, exons);

      expect(gene.introns[0]).toEqual({ start: 6, end: 26, name: 'intron1' });
      expect(gene.getMatureSequence().sequence).toBe('ATGAAATTCTAGGG');
    });
  });

  describe('parseGene failure cases', () => {
    test('rejects empty exon list with kind=no-exons', () => {
      const result = parseGene('ATGCCCGGG', []);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('no-exons');
      }
    });

    test('rejects overlapping exons with kind=exons-overlap', () => {
      const sequence = 'ATGCCCGGGAAATTTGGGAAATTTGGGGGGCCCCC';
      const exons: GenomicRegion[] = [
        { start: 0, end: 12 },
        { start: 6, end: 18 },
      ];
      const result = parseGene(sequence, exons);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('exons-overlap');
      }
    });

    test('rejects exon extending beyond sequence with kind=exon-out-of-bounds', () => {
      const result = parseGene('ATGCCCGGG', [{ start: 0, end: 15 }]);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'exon-out-of-bounds') {
        expect(result.error.exonEnd).toBe(15);
        expect(result.error.sequenceLength).toBe(9);
      } else {
        throw new Error(`expected exon-out-of-bounds, got ${JSON.stringify(result)}`);
      }
    });

    test('rejects invalid coordinate ordering with kind=exon-invalid-coordinates', () => {
      const result = parseGene('ATGCCCGGG', [{ start: 5, end: 3 }]);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('exon-invalid-coordinates');
      }
    });

    test('rejects negative coordinates with kind=exon-invalid-coordinates', () => {
      const result = parseGene('ATGCCCGGG', [{ start: -1, end: 3 }]);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('exon-invalid-coordinates');
      }
    });

    test('rejects invalid DNA sequence with kind=invalid-sequence', () => {
      const result = parseGene('ATXCCCGGG', [{ start: 0, end: 9 }]);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-sequence');
      }
    });
  });

  describe('exon getters', () => {
    const sequence = 'ATGGTCCCAGTTTAAAGGGGGGGGGGGGGGGGCCCCCCCC';
    const exons: GenomicRegion[] = [
      { start: 0, end: 12, name: 'exon1' },
      { start: 32, end: 40, name: 'exon2' },
    ];
    let gene: Gene;

    beforeEach(() => {
      gene = unwrapGene(sequence, exons);
    });

    test('exons array is immutable', () => {
      const arr = gene.exons;
      expect(arr).toHaveLength(2);
      expect(arr[0]).toEqual({ start: 0, end: 12, name: 'exon1' });
      expect(arr[1]).toEqual({ start: 32, end: 40, name: 'exon2' });
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (arr as any).push({ start: 20, end: 25 });
      }).toThrow();
    });

    test('getExonSequence returns the correct substring', () => {
      expect(gene.getExonSequence(0).sequence).toBe('ATGGTCCCAGTT');
      expect(gene.getExonSequence(1).sequence).toBe('CCCCCCCC');
    });

    test('getExonSequence throws RangeError for out-of-bounds index', () => {
      expect(() => gene.getExonSequence(-1)).toThrow(RangeError);
      expect(() => gene.getExonSequence(2)).toThrow(RangeError);
    });

    test('getMatureSequence concatenates exons in gene-position order', () => {
      expect(gene.getMatureSequence().sequence).toBe('ATGGTCCCAGTTCCCCCCCC');
    });
  });

  describe('intron getters', () => {
    let gene: Gene;

    beforeEach(() => {
      gene = unwrapGene(THREE_EXON_GENE.dnaSequence, [...THREE_EXON_GENE.exons]);
    });

    test('introns are calculated and named', () => {
      expect(gene.introns).toHaveLength(2);
      expect(gene.introns[0]).toEqual({ start: 6, end: 27, name: 'intron1' });
      expect(gene.introns[1]).toEqual({ start: 33, end: 54, name: 'intron2' });
    });

    test('getIntronSequence returns the correct substring', () => {
      expect(gene.getIntronSequence(0).sequence).toBe('GTAAGGGGGGGGGGGGGGGAG');
      expect(gene.getIntronSequence(1).sequence).toBe('GTAAGGGGGGGGGGGGGGGAG');
    });

    test('getIntronSequence throws RangeError for out-of-bounds index', () => {
      expect(() => gene.getIntronSequence(-1)).toThrow(RangeError);
      expect(() => gene.getIntronSequence(2)).toThrow(RangeError);
    });
  });

  describe('gene name', () => {
    test('preserves a supplied name', () => {
      const gene = unwrapGene('ATGCCCGGG', [{ start: 0, end: 9 }], 'BRCA1');
      expect(gene.name).toBe('BRCA1');
    });

    test('defaults to undefined when no name is supplied', () => {
      const gene = unwrapGene('ATGCCCGGG', [{ start: 0, end: 9 }]);
      expect(gene.name).toBeUndefined();
    });

    test('preserves the empty string when explicitly supplied', () => {
      const gene = unwrapGene('ATGCCCGGG', [{ start: 0, end: 9 }], '');
      expect(gene.name).toBe('');
    });
  });

  describe('alternative splicing profile validation', () => {
    test('rejects profile with no variants', () => {
      const result = parseGene(
        SIMPLE_TWO_EXON_GENE.dnaSequence,
        [...SIMPLE_TWO_EXON_GENE.exons],
        'Test',
        {
          geneId: 'Test',
          defaultVariant: 'default',
          variants: [],
        },
      );
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-splicing-profile') {
        expect(result.error.reason).toBe('Splicing profile must contain at least one variant');
      } else {
        throw new Error(`expected invalid-splicing-profile, got ${JSON.stringify(result)}`);
      }
    });

    test('rejects variant with no exons', () => {
      const result = parseGene(
        SIMPLE_TWO_EXON_GENE.dnaSequence,
        [...SIMPLE_TWO_EXON_GENE.exons],
        'Test',
        {
          geneId: 'Test',
          defaultVariant: 'empty',
          variants: [{ name: 'empty', includedExons: [] }],
        },
      );
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-variant') {
        expect(result.error.cause.kind).toBe('variant-no-included-exons');
        if (result.error.cause.kind === 'variant-no-included-exons') {
          expect(result.error.cause.variantName).toBe('empty');
        }
      } else {
        throw new Error(`expected invalid-variant, got ${JSON.stringify(result)}`);
      }
    });

    test('rejects variant with invalid exon index', () => {
      const result = parseGene(
        SIMPLE_TWO_EXON_GENE.dnaSequence,
        [...SIMPLE_TWO_EXON_GENE.exons],
        'Test',
        {
          geneId: 'Test',
          defaultVariant: 'invalid',
          variants: [{ name: 'invalid', includedExons: [0, 5] }],
        },
      );
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-variant') {
        expect(result.error.cause.kind).toBe('variant-invalid-exon-index');
        if (result.error.cause.kind === 'variant-invalid-exon-index') {
          expect(result.error.cause.exonIndex).toBe(5);
          expect(result.error.cause.totalExons).toBe(2);
        }
      } else {
        throw new Error(`expected invalid-variant, got ${JSON.stringify(result)}`);
      }
    });

    test('rejects variant with duplicate exon indices', () => {
      const result = parseGene(
        SIMPLE_TWO_EXON_GENE.dnaSequence,
        [...SIMPLE_TWO_EXON_GENE.exons],
        'Test',
        {
          geneId: 'Test',
          defaultVariant: 'duplicate',
          variants: [{ name: 'duplicate', includedExons: [0, 1, 0] }],
        },
      );
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-variant') {
        expect(result.error.cause.kind).toBe('variant-duplicate-exon-indices');
        if (result.error.cause.kind === 'variant-duplicate-exon-indices') {
          expect(result.error.cause.duplicateIndices).toEqual([0]);
        }
      } else {
        throw new Error(`expected invalid-variant, got ${JSON.stringify(result)}`);
      }
    });

    test('rejects profile with duplicate variant names', () => {
      const result = parseGene(
        SIMPLE_TWO_EXON_GENE.dnaSequence,
        [...SIMPLE_TWO_EXON_GENE.exons],
        'Test',
        {
          geneId: 'Test',
          defaultVariant: 'variant1',
          variants: [
            { name: 'variant1', includedExons: [0, 1] },
            { name: 'variant1', includedExons: [0] },
          ],
        },
      );
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-splicing-profile') {
        expect(result.error.reason).toBe('Splicing profile contains duplicate variant names');
      }
    });

    test('rejects profile whose default variant is not in the list', () => {
      const result = parseGene(
        SIMPLE_TWO_EXON_GENE.dnaSequence,
        [...SIMPLE_TWO_EXON_GENE.exons],
        'Test',
        {
          geneId: 'Test',
          defaultVariant: 'missing',
          variants: [{ name: 'variant1', includedExons: [0, 1] }],
        },
      );
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-splicing-profile') {
        expect(result.error.reason).toContain('Default variant');
      }
    });
  });

  describe('getVariantSequence', () => {
    test('returns concatenation of included exons in gene-position order', () => {
      const gene = unwrapGene(SIMPLE_TWO_EXON_GENE.dnaSequence, [...SIMPLE_TWO_EXON_GENE.exons]);
      const sequence = gene.getVariantSequence({ name: 'v', includedExons: [1, 0] }).unwrap();
      expect(sequence.sequence).toBe(gene.getMatureSequence().sequence);
    });

    test('fails when the variant references an invalid exon index', () => {
      const gene = unwrapGene(SIMPLE_TWO_EXON_GENE.dnaSequence, [...SIMPLE_TWO_EXON_GENE.exons]);
      const result = gene.getVariantSequence({ name: 'bad', includedExons: [0, 5] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe('variant-invalid-exon-index');
      }
    });
  });

  describe('GeneError types are exported', () => {
    test('failure branch carries a GeneError', () => {
      const result = parseGene('ATGCCCGGG', []);
      expect(!result.success).toBe(true);
      if (!result.success) {
        const error: GeneError = result.error;
        expect(error.kind).toBe('no-exons');
      }
    });
  });
});
