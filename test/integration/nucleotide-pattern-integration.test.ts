/**
 * Integration tests for NucleotidePattern functionality with real biological scenarios.
 * Exercises pattern matching, reverse complement, and either-strand matching against
 * representative DNA inputs.
 */

import { NucleotidePattern, parseNucleotidePattern } from '../../src/pattern';
import { DNA, RNA, parseDNA, parseRNA } from '../../src/sequence';
import { at } from '../utils/test-utils';

function pattern(source: string): NucleotidePattern {
  return parseNucleotidePattern(source).unwrap();
}

function dna(sequence: string): DNA {
  return parseDNA(sequence).unwrap();
}

function rna(sequence: string): RNA {
  return parseRNA(sequence).unwrap();
}

describe('NucleotidePattern Integration Tests', () => {
  describe('Restriction Enzyme Site Recognition', () => {
    test('EcoRI site recognition with reverse complement', () => {
      const ecoRISite = pattern('GAATTC');
      const forward = dna('ATCGAATTCGTA');
      const reverseDNA = dna('TACGAATTCGAT');

      expect(ecoRISite.matches(forward)).toBe(true);
      expect(ecoRISite.reverseComplement().matches(reverseDNA)).toBe(true);

      expect(ecoRISite.reverseComplement().pattern).toBe('GAATTC');
    });

    test('BamHI site recognition (palindromic site)', () => {
      const bamHISite = pattern('GGATCC');
      const sequence = dna('ATCGGATCCGTA');

      expect(bamHISite.matches(sequence)).toBe(true);

      const reverseComplement = bamHISite.reverseComplement();
      expect(reverseComplement.pattern).toBe('GGATCC');

      expect(bamHISite.matchesEitherStrand(sequence)).toBe(true);
    });

    test('HindIII site location reporting', () => {
      const hindIIIPattern = pattern('AAGCTT');
      const sequence = dna('GCAAAGCTTCGTA');

      expect(hindIIIPattern.matches(sequence)).toBe(true);

      const matches = hindIIIPattern.findAll(sequence);
      expect(matches).toHaveLength(1);
      expect(at(matches, 0).start).toBe(3);
      expect(at(matches, 0).matched).toBe('AAGCTT');
    });
  });

  describe('Promoter Element Detection', () => {
    test('TATA box detection across both DNA strands', () => {
      const tataPattern = pattern('TATAAA');
      const promoterDNA = dna('ATGAAATATAAACGCGATCGTAGC');

      expect(tataPattern.matches(promoterDNA)).toBe(true);
      expect(tataPattern.matchesEitherStrand(promoterDNA)).toBe(true);

      const reverseComplement = tataPattern.reverseComplement();
      expect(reverseComplement.pattern).toBe('TTTATA');

      const reverseTATADNA = dna('ATGAAATTTATAACGCGATCGTAGC');
      expect(tataPattern.matchesEitherStrand(reverseTATADNA)).toBe(true);
    });

    test('CAAT box finds multiple occurrences', () => {
      const caatPattern = pattern('CAAT');
      const promoterRegion = dna('GCCCAATGGGTATAAAACGCGTACAAT');

      const matches = caatPattern.findAll(promoterRegion);
      expect(matches).toHaveLength(2);
      expect(at(matches, 0).start).toBe(3);
      expect(at(matches, 1).start).toBe(23);
    });

    test('GC box recognition with reverse complement', () => {
      const gcBoxPattern = pattern('GGGCGG');
      const promoterDNA = dna('ATCGGGCGGCTATGCCCGCCCTAG');

      expect(gcBoxPattern.matches(promoterDNA)).toBe(true);

      const reverseComplement = gcBoxPattern.reverseComplement();
      expect(reverseComplement.pattern).toBe('CCGCCC');
      expect(reverseComplement.matches(promoterDNA)).toBe(true);
    });
  });

  describe('Splice Site Recognition', () => {
    test('GT / AG splice sites with reverse complement', () => {
      const donorSite = pattern('GT');
      const acceptorSite = pattern('AG');

      const geneSequence = dna('ATGAAACCCGTAAGTATATATTAGCCCAAATAA');

      expect(donorSite.findAll(geneSequence).length).toBeGreaterThan(0);
      expect(acceptorSite.findAll(geneSequence).length).toBeGreaterThan(0);

      expect(donorSite.reverseComplement().pattern).toBe('AC');
      expect(acceptorSite.reverseComplement().pattern).toBe('CT');
    });

    test('exon junction pattern matches DNA but not RNA (literal T vs U)', () => {
      const exonJunction = pattern('AGGTAAGT');
      const dnaSequence = dna('ATGAAACCCAGGTAAGTTATATATCCCAAATAA');
      expect(exonJunction.matches(dnaSequence)).toBe(true);

      const rnaSequence = rna('AUGAAACCCAGGUAAGUUAUAUAUCCCAAAUAA');
      expect(exonJunction.matches(rnaSequence)).toBe(false);
    });
  });

  describe('Regulatory Element Detection', () => {
    test('canonical poly-A DNA signal', () => {
      const polyASignal = pattern('AATAAA');
      const geneEnd = dna('ATGAAACCCAATAAACCCGGGAAATAA');

      expect(polyASignal.matches(geneEnd)).toBe(true);

      const match = polyASignal.findFirst(geneEnd);
      expect(match).toBeDefined();
      expect(match?.start).toBe(9);
      expect(match?.matched).toBe('AATAAA');
    });

    test('E-box with degenerate center', () => {
      const enhancerPattern = pattern('CANNTG');
      const enhancerRegion = dna('GCCCACGTGGGTATAAACAATTGCGTA');

      const matches = enhancerPattern.findAll(enhancerRegion);
      expect(matches).toHaveLength(2);
    });
  });

  describe('Cross-Pattern Integration', () => {
    test('multiple patterns in gene regulatory region', () => {
      const tataBox = pattern('TATAAA');
      const caatBox = pattern('CAAT');
      const gcBox = pattern('GGGCGG');

      const promoterRegion = dna('GGGCGGCCCAATGGGTATAAAACGCGTA');

      expect(tataBox.matches(promoterRegion)).toBe(true);
      expect(caatBox.matches(promoterRegion)).toBe(true);
      expect(gcBox.matches(promoterRegion)).toBe(true);

      expect(gcBox.findFirst(promoterRegion)?.start).toBe(0);
      expect(caatBox.findFirst(promoterRegion)?.start).toBe(8);
      expect(tataBox.findFirst(promoterRegion)?.start).toBe(15);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('large sequence pattern searching', () => {
      const targetPattern = pattern('ATGCGATCG');
      const largeSequence = dna('ATGCGATCG'.repeat(1000) + 'AAATGCGATCGAAA');

      const matches = targetPattern.findAll(largeSequence);
      expect(matches.length).toBeGreaterThan(1000);

      const startTime = Date.now();
      targetPattern.findAll(largeSequence);
      expect(Date.now() - startTime).toBeLessThan(100);
    });

    test('reverse-complement is involutive for IUPAC-only patterns', () => {
      const patterns = [
        'A',
        'T',
        'C',
        'G',
        'AT',
        'GC',
        'TA',
        'CG',
        'ATCG',
        'GCTA',
        'TATGCGTA',
        'R',
        'Y',
        'W',
        'S',
        'M',
        'K',
        'RY',
        'WS',
        'MK',
        'NNNN',
      ];

      for (const source of patterns) {
        const compiled = pattern(source);
        const doubleRC = compiled.reverseComplement().reverseComplement();
        expect(doubleRC.pattern).toBe(compiled.pattern);
      }
    });
  });
});
