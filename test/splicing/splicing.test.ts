import { spliceRNA } from '../../src/splicing';
import { parsePreMRNA } from '../../src/transcription';
import { parseGene } from '../../src/gene';
import {
  SIMPLE_TWO_EXON_GENE,
  THREE_EXON_GENE,
  SINGLE_EXON_GENE,
  INVALID_SPLICE_GENE,
} from '../test-genes';

describe('spliceRNA', () => {
  test('splices a two-exon gene into a mature transcript', () => {
    const gene = parseGene(SIMPLE_TWO_EXON_GENE.dnaSequence, [
      ...SIMPLE_TWO_EXON_GENE.exons,
    ]).unwrap();
    const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, gene, 0).unwrap();
    const result = spliceRNA(preMRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe(SIMPLE_TWO_EXON_GENE.splicedRNA);
    }
  });

  test('splices a three-exon gene correctly', () => {
    const gene = parseGene(THREE_EXON_GENE.dnaSequence, [...THREE_EXON_GENE.exons]).unwrap();
    const preMRNA = parsePreMRNA(THREE_EXON_GENE.rnaSequence, gene, 0).unwrap();
    const result = spliceRNA(preMRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe(THREE_EXON_GENE.splicedRNA);
    }
  });

  test('passes through a single-exon transcript unchanged', () => {
    const gene = parseGene(SINGLE_EXON_GENE.dnaSequence, [...SINGLE_EXON_GENE.exons]).unwrap();
    const preMRNA = parsePreMRNA(SINGLE_EXON_GENE.rnaSequence, gene, 0).unwrap();
    const result = spliceRNA(preMRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe(SINGLE_EXON_GENE.splicedRNA);
    }
  });

  test("rejects an invalid 5' splice site with a structured error", () => {
    const gene = parseGene(INVALID_SPLICE_GENE.dnaSequence, [
      ...INVALID_SPLICE_GENE.exons,
    ]).unwrap();
    const preMRNA = parsePreMRNA(INVALID_SPLICE_GENE.rnaSequence, gene, 0).unwrap();
    const result = spliceRNA(preMRNA);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'splicing/invalid-donor-site') {
      expect(result.error.intronIndex).toBe(0);
      expect(result.error.found).not.toBe('GU');
    }
  });

  test("rejects an invalid 3' splice site when the donor is valid", () => {
    const dnaSequence = 'ATGAAAGTTCCCCCCCCCCCCCCCCCCGGG';
    const exons = [
      { start: 0, end: 6, name: 'exon1' },
      { start: 26, end: 29, name: 'exon2' },
    ];
    const gene = parseGene(dnaSequence, exons).unwrap();
    const rnaSequence = 'AUGAAAGUUCCCCCCCCCCCCCCCCCCGGG';
    const preMRNA = parsePreMRNA(rnaSequence, gene, 0).unwrap();
    const result = spliceRNA(preMRNA);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('splicing/invalid-acceptor-site');
    }
  });

  test('skipSpliceSiteValidation bypasses the consensus check', () => {
    const gene = parseGene(INVALID_SPLICE_GENE.dnaSequence, [
      ...INVALID_SPLICE_GENE.exons,
    ]).unwrap();
    const preMRNA = parsePreMRNA(INVALID_SPLICE_GENE.rnaSequence, gene, 0).unwrap();

    const validated = spliceRNA(preMRNA);
    expect(!validated.success).toBe(true);

    const bypassed = spliceRNA(preMRNA, { skipSpliceSiteValidation: true });
    expect(bypassed.success).toBe(true);
    if (bypassed.success) {
      expect(bypassed.data.sequence).toBe('AUGAAAUCGGG');
    }
  });
});
