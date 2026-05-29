import {
  MIN_EXON_SIZE,
  MAX_EXON_SIZE,
  MIN_INTRON_SIZE,
  MAX_INTRON_SIZE,
  TATA_BOX_TYPICAL_POSITION,
  DPE_TYPICAL_POSITION,
} from '../../src/gene';

/**
 * Validates gene-structure biological constants against known scientific literature.
 *
 * References:
 * - Sakharkar et al. (2004) In Silico Biology, "Distributions of exons and introns in the human genome"
 * - Talerico & Berget (1994) Mol Cell Biol, "Intron definition in splicing of small Drosophila introns"
 * - Venter et al. (2001) Science, "The sequence of the human genome"
 * - Tennyson et al. (1995) Genomics, "The human dystrophin gene requires 16 hours to be transcribed"
 * - Sandelin et al. (2007) Nature Reviews Genetics, "Mammalian RNA polymerase II core promoters"
 * - Burke & Kadonaga (1997) Genes & Development, "The downstream core promoter element"
 */
describe('Gene biological constants', () => {
  describe('Exon size constraints', () => {
    test('MIN_EXON_SIZE allows single-codon exons', () => {
      expect(MIN_EXON_SIZE).toBe(3);
    });

    test('MAX_EXON_SIZE is realistic for human genes', () => {
      expect(MAX_EXON_SIZE).toBe(50000);
      expect(MAX_EXON_SIZE).toBeGreaterThan(17000);
    });
  });

  describe('Intron size constraints', () => {
    test('MIN_INTRON_SIZE permits spliceosome recognition', () => {
      expect(MIN_INTRON_SIZE).toBe(20);
      expect(MIN_INTRON_SIZE).toBeGreaterThanOrEqual(20);
    });

    test('MAX_INTRON_SIZE covers the largest known mammalian intron with headroom', () => {
      expect(MAX_INTRON_SIZE).toBe(3000000);
    });
  });

  describe('Promoter element positioning', () => {
    test('TATA_BOX_TYPICAL_POSITION matches known positioning', () => {
      expect(TATA_BOX_TYPICAL_POSITION).toBe(-25);
      expect(TATA_BOX_TYPICAL_POSITION).toBeGreaterThanOrEqual(-35);
      expect(TATA_BOX_TYPICAL_POSITION).toBeLessThanOrEqual(-20);
    });

    test('DPE_TYPICAL_POSITION matches known positioning', () => {
      expect(DPE_TYPICAL_POSITION).toBe(30);
      expect(DPE_TYPICAL_POSITION).toBeGreaterThanOrEqual(25);
      expect(DPE_TYPICAL_POSITION).toBeLessThanOrEqual(35);
    });
  });

  describe('Cross-constant relationships', () => {
    test('Minimum sizes are smaller than maximum sizes', () => {
      expect(MIN_EXON_SIZE).toBeLessThan(MAX_EXON_SIZE);
      expect(MIN_INTRON_SIZE).toBeLessThan(MAX_INTRON_SIZE);
    });
  });
});
