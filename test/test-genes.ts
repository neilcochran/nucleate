/**
 * Realistic gene sequences for testing that meet biological constraints:
 * - Introns ≥ 20 bp with proper GT...AG splice sites
 * - Exons ≥ 3 bp and ≤ 50,000 bp
 * - Proper start codons (ATG) and biological sequences
 *
 * Each fixture's `splicedRNA` is derived from its `rnaSequence` + `exons` at module load
 * via `buildGeneFixture`, so it cannot drift out of sync if either input is edited.
 */

import { GenomicRegion } from '../src/coordinates';

function spliceFromExons(rnaSequence: string, exons: readonly GenomicRegion[]): string {
  return exons.map(({ start, end }) => rnaSequence.substring(start, end)).join('');
}

function buildGeneFixture<
  T extends {
    readonly dnaSequence: string;
    readonly rnaSequence: string;
    readonly exons: readonly GenomicRegion[];
  },
>(parts: T): T & { readonly splicedRNA: string } {
  return {
    ...parts,
    splicedRNA: spliceFromExons(parts.rnaSequence, parts.exons),
  };
}

// Simple two-exon gene with 20bp intron and stop codon
export const SIMPLE_TWO_EXON_GENE = buildGeneFixture({
  dnaSequence: 'ATGAAAGTATGCCCAAGTTTCGGGAGTTCTAGGG', // 34bp total, proper GT...AG splice sites with stop codon
  rnaSequence: 'AUGAAAGUAUGCCCAAGUUUCGGGAGUUCUAGGG',
  exons: [
    { start: 0, end: 6, name: 'exon1' }, // ATGAAA -> AUGAAA
    { start: 26, end: 34, name: 'exon2' }, // TTCTAGG -> UUCUAGGG (includes UAG stop codon)
  ] as GenomicRegion[],
  intronLength: 20, // positions 6-26 (GT...AG splice sites)
});

// Three-exon gene with proper splice sites and 20bp+ introns and stop codon
export const THREE_EXON_GENE = buildGeneFixture({
  dnaSequence: 'ATGAAAGTAAGGGGGGGGGGGGGGGAGCCCGGGGTAAGGGGGGGGGGGGGGGAGTAGAAACCC', // 63bp total
  rnaSequence: 'AUGAAAGUAAGGGGGGGGGGGGGGGAGCCCGGGGUAAGGGGGGGGGGGGGGGAGUGAAACCC',
  exons: [
    { start: 0, end: 6, name: 'exon1' }, // ATGAAA -> AUGAAA
    { start: 27, end: 33, name: 'exon2' }, // CCCGGG -> CCCGGG
    { start: 54, end: 60, name: 'exon3' }, // TAGAAA -> UGAAAA
  ] as GenomicRegion[],
  intron1Length: 21, // positions 6-27 (GT...AG splice sites)
  intron2Length: 21, // positions 33-54 (GT...AG splice sites)
});

// Single exon gene (no splicing needed) with stop codon
export const SINGLE_EXON_GENE = buildGeneFixture({
  dnaSequence: 'ATGAAACCCGGGTAG', // 15bp with UAG stop codon
  rnaSequence: 'AUGAAACCCGGGUAG',
  exons: [{ start: 0, end: 15, name: 'exon1' }] as GenomicRegion[],
});

// Gene with invalid splice sites (for negative testing); no splicedRNA because splicing
// is expected to fail validation before it would be computed.
export const INVALID_SPLICE_GENE = {
  dnaSequence: 'ATGAAACACGCCCAAATTCGGGAAATTCGGG', // 31bp - invalid AC...AA splice sites
  rnaSequence: 'AUGAAACACGCCCAAAUUCGGGAAAUUCGGG',
  exons: [
    { start: 0, end: 6, name: 'exon1' }, // ATGAAA
    { start: 26, end: 31, name: 'exon2' }, // TCGGG - 20bp intron but AC...AA splice sites
  ] as GenomicRegion[],
  // This should fail splice site validation due to AC...AA instead of GT...AG
};

// Larger gene for complex testing. Trailing 16bp 3'UTR-style tail past the AATAAA
// signal provides the analyzer's 11-23bp cleavage window with biologically reasonable
// A/U-rich context; without it the signal sits at the gene end and is rejected for
// having no cleavage-site room.
export const COMPLEX_GENE = buildGeneFixture({
  dnaSequence: 'GGGCCCATGAAAGTACGCCCAAGAGAGGGTAGATAAAAATAAACGCAGGCCATTCAAGC',
  rnaSequence: 'GGGCCCAUGAAAGUACGCCCAAGAGAGGGUAGAUAAAAAUAAACGCAGGCCAUUCAAGC',
  exons: [
    { start: 6, end: 12, name: 'exon1' }, // ATGAAA
    { start: 32, end: 41, name: 'exon2' }, // ATAAAAAAT -> AUAAAAAAU
  ] as GenomicRegion[],
  intronLength: 20, // positions 12-32
});

// Short gene that meets minimum constraints
export const MINIMAL_GENE = buildGeneFixture({
  dnaSequence: 'ATGAAAGGGGGGGGGGGGGGGGGAGCCC',
  rnaSequence: 'AUGAAAGGGGGGGGGGGGGGGGGAGCCC',
  exons: [
    { start: 0, end: 6, name: 'exon1' }, // ATGAAA (6bp)
    { start: 26, end: 29, name: 'exon2' }, // CCC (3bp - minimum)
  ] as GenomicRegion[],
  intronLength: 20, // positions 6-26 = exactly 20bp
});

// Four-exon gene for alternative splicing tests
export const FOUR_EXON_GENE = buildGeneFixture({
  dnaSequence: 'ATGAAAGTAAGGGGGGGGGGGGGGAGCCCGGGGTAAGGGGGGGGGGGGGGAGGGGTTTGTAAGGGGGGGGGGGGGGAGTAG', // 80bp
  rnaSequence:
    'AUGAAAGUAAGGGGGGGGGGGGGGGAGCCCGGGGUAAGGGGGGGGGGGGGGGAGGGGGUUUGUAAGGGGGGGGGGGGGGGAGUAG',
  exons: [
    { start: 0, end: 6, name: 'exon1' }, // ATGAAA (6bp) -> AUGAAA
    { start: 26, end: 32, name: 'exon2' }, // CCCGGG (6bp) -> CCCGGG
    { start: 52, end: 58, name: 'exon3' }, // GGGTTT (6bp) -> GGGUUU
    { start: 78, end: 81, name: 'exon4' }, // TAG (3bp) -> UAG (stop codon)
  ] as GenomicRegion[],
  intron1Length: 20, // positions 6-26
  intron2Length: 20, // positions 32-52
  intron3Length: 20, // positions 58-78
});
