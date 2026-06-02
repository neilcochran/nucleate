import {
  processRNA,
  DEFAULT_RNA_PROCESSING_OPTIONS,
  type RNAProcessingOptions,
} from '../../src/processing';
import { DEFAULT_POLY_A_TAIL_LENGTH } from '../../src/polyadenylation';
import { parseGene } from '../../src/gene';
import { parsePreMRNA } from '../../src/transcription';
import { GenomicRegion } from '../../src/coordinates';
import { SIMPLE_TWO_EXON_GENE, SINGLE_EXON_GENE, INVALID_SPLICE_GENE } from '../test-genes';
import { requireCodingSequence } from '../utils/test-utils';

describe('processRNA', () => {
  test('processes a two-exon gene into a mature mRNA', () => {
    const gene = parseGene(SIMPLE_TWO_EXON_GENE.dnaSequence, [
      ...SIMPLE_TWO_EXON_GENE.exons,
    ]).unwrap();
    const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, gene, 0).unwrap();
    const result = processRNA(preMRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      const mRNA = result.data;
      expect(mRNA.fivePrimeCap).toBe(true);
      expect(mRNA.polyATailLength).toBe(DEFAULT_POLY_A_TAIL_LENGTH);
      expect(requireCodingSequence(mRNA).sequence).toContain('AUG');
    }
  });

  test('processes a single-exon gene with stop codon', () => {
    const gene = parseGene(SINGLE_EXON_GENE.dnaSequence, [...SINGLE_EXON_GENE.exons]).unwrap();
    const preMRNA = parsePreMRNA(SINGLE_EXON_GENE.rnaSequence, gene, 0).unwrap();
    const result = processRNA(preMRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(requireCodingSequence(result.data).sequence).toBe('AUGAAACCCGGGUAG');
    }
  });

  test('respects addFivePrimeCap=false / addPolyATail=false', () => {
    const exons: GenomicRegion[] = [{ start: 0, end: 15, name: 'exon1' }];
    const gene = parseGene('ATGAAACCCGGGTAA', exons).unwrap();
    const preMRNA = parsePreMRNA('AUGAAACCCGGGUAA', gene, 0).unwrap();
    const opts: RNAProcessingOptions = {
      addFivePrimeCap: false,
      addPolyATail: false,
    };
    const result = processRNA(preMRNA, opts);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fivePrimeCap).toBe(false);
      expect(result.data.polyATailLength).toBe(0);
    }
  });

  test('returns no-start-codon when validateCodons is enabled and AUG is absent', () => {
    const exons: GenomicRegion[] = [{ start: 0, end: 12, name: 'exon1' }];
    const gene = parseGene('AAACCCGGGTAA', exons).unwrap();
    const preMRNA = parsePreMRNA('AAACCCGGGUAA', gene, 0).unwrap();
    const result = processRNA(preMRNA);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('no-start-codon');
    }
  });

  test('returns no-in-frame-stop when the spliced sequence has AUG but no stop', () => {
    const exons: GenomicRegion[] = [{ start: 0, end: 15, name: 'exon1' }];
    const gene = parseGene('ATGAAACCCGGGAAA', exons).unwrap();
    const preMRNA = parsePreMRNA('AUGAAACCCGGGAAA', gene, 0).unwrap();
    const result = processRNA(preMRNA);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('no-in-frame-stop');
    }
  });

  test('returns splicing-failed when an intron violates the consensus', () => {
    const gene = parseGene(INVALID_SPLICE_GENE.dnaSequence, [
      ...INVALID_SPLICE_GENE.exons,
    ]).unwrap();
    const preMRNA = parsePreMRNA(INVALID_SPLICE_GENE.rnaSequence, gene, 0).unwrap();
    const result = processRNA(preMRNA);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'splicing-failed') {
      expect(result.error.cause.kind).toBe('invalid-donor-site');
    }
  });

  test('skipSpliceSiteValidation bypasses the consensus check', () => {
    const gene = parseGene(INVALID_SPLICE_GENE.dnaSequence, [
      ...INVALID_SPLICE_GENE.exons,
    ]).unwrap();
    const preMRNA = parsePreMRNA(INVALID_SPLICE_GENE.rnaSequence, gene, 0).unwrap();
    const result = processRNA(preMRNA, {
      skipSpliceSiteValidation: true,
      validateCodons: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const mRNA = result.data;
      expect(mRNA.fivePrimeCap).toBe(true);
      expect(mRNA.polyATailLength).toBe(DEFAULT_POLY_A_TAIL_LENGTH);
    }
  });

  test('tolerates a missing CDS when validateCodons is false (non-coding mRNA)', () => {
    const exons: GenomicRegion[] = [{ start: 0, end: 12, name: 'exon1' }];
    const gene = parseGene('AAACCCGGGTAA', exons).unwrap();
    const preMRNA = parsePreMRNA('AAACCCGGGUAA', gene, 0).unwrap();
    const result = processRNA(preMRNA, { validateCodons: false, addPolyATail: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.codingStart).toBeUndefined();
      expect(result.data.codingEnd).toBeUndefined();
      expect(result.data.codingSequence).toBeUndefined();
    }
  });

  test('uses the real CDS, not a fabricated full-length span, when validateCodons is false', () => {
    const exons: GenomicRegion[] = [{ start: 0, end: 18, name: 'exon1' }];
    const gene = parseGene('GGGATGAAACCCTAGCCC', exons).unwrap();
    const preMRNA = parsePreMRNA('GGGAUGAAACCCUAGCCC', gene, 0).unwrap();
    const result = processRNA(preMRNA, { validateCodons: false, addPolyATail: false });
    expect(result.success).toBe(true);
    if (result.success) {
      // The real AUG..UAG span at [3, 15), not the old fabricated [0, len) span.
      expect(result.data.codingStart).toBe(3);
      expect(result.data.codingEnd).toBe(15);
      expect(requireCodingSequence(result.data).sequence).toBe('AUGAAACCCUAG');
    }
  });
});

describe('DEFAULT_RNA_PROCESSING_OPTIONS', () => {
  test('has expected defaults', () => {
    expect(DEFAULT_RNA_PROCESSING_OPTIONS.addFivePrimeCap).toBe(true);
    expect(DEFAULT_RNA_PROCESSING_OPTIONS.addPolyATail).toBe(true);
    expect(DEFAULT_RNA_PROCESSING_OPTIONS.polyATailLength).toBe(DEFAULT_POLY_A_TAIL_LENGTH);
    expect(DEFAULT_RNA_PROCESSING_OPTIONS.validateCodons).toBe(true);
    expect(DEFAULT_RNA_PROCESSING_OPTIONS.skipSpliceSiteValidation).toBe(false);
  });
});
