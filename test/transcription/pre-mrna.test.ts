import { parsePreMRNA } from '../../src/transcription';
import { parseGene, Gene } from '../../src/gene';
import { SIMPLE_TWO_EXON_GENE, SINGLE_EXON_GENE } from '../test-genes';

describe('PreMRNA', () => {
  let testGene: Gene;

  beforeEach(() => {
    testGene = parseGene(SIMPLE_TWO_EXON_GENE.dnaSequence, [
      ...SIMPLE_TWO_EXON_GENE.exons,
    ]).unwrap();
  });

  describe('parsePreMRNA', () => {
    test('parses pre-mRNA with TSS at the gene start', () => {
      const result = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0);
      expect(result.success).toBe(true);
      if (result.success) {
        const preMRNA = result.data;
        expect(preMRNA.sequence.sequence).toBe(SIMPLE_TWO_EXON_GENE.rnaSequence);
        expect(preMRNA.sourceGene).toBe(testGene);
        expect(preMRNA.transcriptionStartSite).toBe(0);
      }
    });

    test('parses pre-mRNA with non-zero TSS (partial first exon)', () => {
      const result = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence.substring(3), testGene, 3);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transcriptionStartSite).toBe(3);
      }
    });

    test('rejects negative TSS', () => {
      const result = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, -1);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('tss-out-of-bounds');
      }
    });

    test('rejects malformed RNA sequence with the underlying RNA-parser error surfaced', () => {
      const result = parsePreMRNA('AUGXX', testGene, 0);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-rna-sequence') {
        expect(result.error.cause.kind).toBe('invalid-characters');
        if (result.error.cause.kind === 'invalid-characters') {
          expect(result.error.cause.chars).toEqual(['X']);
          expect(result.error.cause.firstAt).toBe(3);
        }
      }
    });

    test('rejects empty RNA sequence with the underlying RNA-parser error surfaced', () => {
      const result = parsePreMRNA('', testGene, 0);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-rna-sequence') {
        expect(result.error.cause.kind).toBe('empty-sequence');
      }
    });
  });

  describe('exonRegions', () => {
    test('returns exon regions in transcript coordinates when TSS = 0', () => {
      const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0).unwrap();
      const regions = preMRNA.exonRegions;
      expect(regions).toHaveLength(2);
      expect(regions[0]).toEqual({ start: 0, end: 6, name: 'exon1' });
      expect(regions[1]).toEqual({ start: 26, end: 34, name: 'exon2' });
    });

    test('shifts coordinates by TSS for a partial-first-exon transcript', () => {
      const preMRNA = parsePreMRNA(
        SIMPLE_TWO_EXON_GENE.rnaSequence.substring(3),
        testGene,
        3,
      ).unwrap();
      const regions = preMRNA.exonRegions;
      expect(regions).toHaveLength(2);
      expect(regions[0]).toEqual({ start: -3, end: 3, name: 'exon1' });
      expect(regions[1]).toEqual({ start: 23, end: 31, name: 'exon2' });
    });

    test('filters out exons entirely upstream of the TSS', () => {
      const preMRNA = parsePreMRNA(
        SIMPLE_TWO_EXON_GENE.rnaSequence.substring(6),
        testGene,
        6,
      ).unwrap();
      const regions = preMRNA.exonRegions;
      expect(regions).toHaveLength(1);
      expect(regions[0]).toEqual({ start: 20, end: 28, name: 'exon2' });
    });

    test('filters out exons entirely past the transcript end (TSS beyond gene)', () => {
      const preMRNA = parsePreMRNA('UUU', testGene, 100).unwrap();
      expect(preMRNA.exonRegions).toHaveLength(0);
    });

    test('regions are frozen', () => {
      const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0).unwrap();
      expect(Object.isFrozen(preMRNA.exonRegions)).toBe(true);
    });
  });

  describe('intronRegions', () => {
    test('returns intron regions in transcript coordinates', () => {
      const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0).unwrap();
      const regions = preMRNA.intronRegions;
      expect(regions).toHaveLength(1);
      expect(regions[0]).toEqual({ start: 6, end: 26, name: undefined });
    });

    test('shifts intron coordinates with the TSS', () => {
      const preMRNA = parsePreMRNA(
        SIMPLE_TWO_EXON_GENE.rnaSequence.substring(3),
        testGene,
        3,
      ).unwrap();
      const regions = preMRNA.intronRegions;
      expect(regions).toHaveLength(1);
      expect(regions[0]).toEqual({ start: 3, end: 23, name: undefined });
    });
  });

  describe('getSplicedSequence', () => {
    test('joins full exons when TSS = 0', () => {
      const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0).unwrap();
      expect(preMRNA.getSplicedSequence().sequence).toBe(SIMPLE_TWO_EXON_GENE.splicedRNA);
    });

    test('handles partial first exon', () => {
      const preMRNA = parsePreMRNA(
        SIMPLE_TWO_EXON_GENE.rnaSequence.substring(3),
        testGene,
        3,
      ).unwrap();
      expect(preMRNA.getSplicedSequence().sequence).toBe('AAAUUCUAGGG');
    });
  });

  describe('hasIntrons', () => {
    test('returns true when introns are present', () => {
      const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0).unwrap();
      expect(preMRNA.hasIntrons()).toBe(true);
    });

    test('returns false for a single-exon gene', () => {
      const gene = parseGene(SINGLE_EXON_GENE.dnaSequence, [...SINGLE_EXON_GENE.exons]).unwrap();
      const preMRNA = parsePreMRNA(SINGLE_EXON_GENE.rnaSequence, gene, 0).unwrap();
      expect(preMRNA.hasIntrons()).toBe(false);
    });
  });

  describe('getTotalIntronLength / getTotalExonLength', () => {
    test('sums intron lengths', () => {
      const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0).unwrap();
      expect(preMRNA.getTotalIntronLength()).toBe(20);
    });

    test('returns 0 introns for single-exon gene', () => {
      const gene = parseGene(SINGLE_EXON_GENE.dnaSequence, [...SINGLE_EXON_GENE.exons]).unwrap();
      const preMRNA = parsePreMRNA(SINGLE_EXON_GENE.rnaSequence, gene, 0).unwrap();
      expect(preMRNA.getTotalIntronLength()).toBe(0);
    });

    test('sums exon lengths', () => {
      const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0).unwrap();
      expect(preMRNA.getTotalExonLength()).toBe(14);
    });

    test('clamps partial-first-exon length to transcript bounds', () => {
      const preMRNA = parsePreMRNA(
        SIMPLE_TWO_EXON_GENE.rnaSequence.substring(3),
        testGene,
        3,
      ).unwrap();
      expect(preMRNA.getTotalExonLength()).toBe(11);
    });
  });

  describe('toString', () => {
    test('reports nt length and exon/intron counts', () => {
      const preMRNA = parsePreMRNA(SIMPLE_TWO_EXON_GENE.rnaSequence, testGene, 0).unwrap();
      expect(preMRNA.toString()).toBe(
        `PreMRNA(${SIMPLE_TWO_EXON_GENE.rnaSequence.length}nt, 2 exons, 1 introns)`,
      );
    });

    test('reports single-exon gene', () => {
      const gene = parseGene(SINGLE_EXON_GENE.dnaSequence, [...SINGLE_EXON_GENE.exons]).unwrap();
      const preMRNA = parsePreMRNA(SINGLE_EXON_GENE.rnaSequence, gene, 0).unwrap();
      expect(preMRNA.toString()).toBe(
        `PreMRNA(${SINGLE_EXON_GENE.rnaSequence.length}nt, 1 exons, 0 introns)`,
      );
    });
  });

  describe('large fixtures', () => {
    test('handles a long synthetic gene', () => {
      const longSequence = 'A'.repeat(10000);
      const longGene = parseGene(longSequence, [
        { start: 0, end: 1000 },
        { start: 5000, end: 6000 },
      ]).unwrap();
      const preMRNA = parsePreMRNA(longSequence.replace(/T/g, 'U'), longGene, 0).unwrap();
      expect(preMRNA.getTotalExonLength()).toBe(2000);
      expect(preMRNA.getTotalIntronLength()).toBe(4000);
      expect(preMRNA.hasIntrons()).toBe(true);
    });
  });
});
