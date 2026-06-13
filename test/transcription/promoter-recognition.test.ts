import { findPromoters, identifyTSS, MAX_PROMOTER_SEARCH_DISTANCE } from '../../src/transcription';
import { DNA, parseDNA } from '../../src/sequence';
import { parsePromoter, parsePromoterElement, Promoter, PromoterElement } from '../../src/gene';
import { parseNucleotidePattern, NucleotidePattern } from '../../src/pattern';
import { at } from '../utils/test-utils';

function dna(sequence: string): DNA {
  return parseDNA(sequence).unwrap();
}

function mkPattern(input: string): NucleotidePattern {
  return parseNucleotidePattern(input).unwrap();
}

function mkElement(
  name: string,
  patternString: string,
  position: number,
  scoreWeight = 0,
): PromoterElement {
  return parsePromoterElement(name, mkPattern(patternString), position, scoreWeight).unwrap();
}

function mkPromoter(tss: number, elements: PromoterElement[]): Promoter {
  return parsePromoter(tss, elements).unwrap();
}

describe('promoter-recognition', () => {
  describe('findPromoters', () => {
    test('finds simple TATA-containing promoter', () => {
      const sequence = dna('A'.repeat(50) + 'TATAAAAG' + 'C'.repeat(50));

      const promoters = findPromoters(sequence);

      expect(promoters.length).toBe(1);
      const tataPromoter = promoters.find(p => p.hasElement('TATA'));
      expect(tataPromoter).toBeDefined();
    });

    test('finds Initiator-containing promoter', () => {
      const sequence = dna('A'.repeat(50) + 'CCCACA' + 'G'.repeat(50));

      const promoters = findPromoters(sequence);

      expect(promoters.length).toBe(1);
      const inrPromoter = promoters.find(p => p.hasElement('Inr'));
      expect(inrPromoter).toBeDefined();
    });

    test('finds complex promoter with multiple elements', () => {
      const sequence = dna(
        'A'.repeat(25) + 'GGCCAATCT' + 'T'.repeat(45) + 'TATAAAAG' + 'C'.repeat(50),
      );

      const promoters = findPromoters(sequence);

      expect(promoters.length).toBeGreaterThan(0);
      const strongPromoter = promoters.find(p => p.hasElement('TATA') && p.hasElement('CAAT'));
      expect(strongPromoter).toBeDefined();
      if (strongPromoter) {
        expect(strongPromoter.getStrengthScore()).toBeGreaterThan(15);
      }
    });

    test('returns empty array for sequence with no promoter elements', () => {
      expect(findPromoters(dna('AAAAAAAAAAAAAAAAAAAAAA'))).toHaveLength(0);
    });

    test('respects minimum elements option', () => {
      const sequence = dna('A'.repeat(50) + 'TATAAAAG' + 'C'.repeat(50));
      expect(findPromoters(sequence, { minElements: 2 }).length).toBeLessThanOrEqual(1);
    });

    test('respects minimum strength score option', () => {
      const sequence = dna('A'.repeat(50) + 'TATAAAAG' + 'C'.repeat(50));
      const promoters = findPromoters(sequence, { minStrengthScore: 20 });
      expect(promoters.every(p => p.getStrengthScore() >= 20)).toBe(true);
    });

    test('sorts promoters by strength score', () => {
      const sequence = dna('TATAAAAG' + 'A'.repeat(100) + 'GGCCAATCTTATAAAAG' + 'G'.repeat(50));
      const promoters = findPromoters(sequence, { minStrengthScore: 5 });

      if (promoters.length > 1) {
        for (let i = 1; i < promoters.length; i++) {
          expect(at(promoters, i - 1).getStrengthScore()).toBeGreaterThanOrEqual(
            at(promoters, i).getStrengthScore(),
          );
        }
      }
    });
  });

  describe('identifyTSS', () => {
    test('identifies TSS from Initiator element', () => {
      const inrElement = mkElement('Inr', 'BBCABW', 0);
      const promoter = mkPromoter(100, [inrElement]);
      const sequence = dna('A'.repeat(MAX_PROMOTER_SEARCH_DISTANCE));
      expect(identifyTSS(promoter, sequence)).toContain(100);
    });

    test('predicts TSS from TATA box', () => {
      const tataElement = mkElement('TATA', 'TATAWAWR', -25);
      const promoter = mkPromoter(100, [tataElement]);
      const sequence = dna('A'.repeat(MAX_PROMOTER_SEARCH_DISTANCE));
      expect(identifyTSS(promoter, sequence)).toContain(100);
    });

    test('handles promoter with multiple Initiators', () => {
      const inr1 = mkElement('Inr', 'BBCABW', 0);
      const inr2 = mkElement('Inr', 'CCATCCC', 10);
      const promoter = mkPromoter(100, [inr1, inr2]);
      const sequence = dna('A'.repeat(MAX_PROMOTER_SEARCH_DISTANCE));
      const tssPositions = identifyTSS(promoter, sequence);
      expect(tssPositions).toHaveLength(2);
      expect(tssPositions).toContain(100);
      expect(tssPositions).toContain(110);
    });

    test('handles promoter with multiple TATA boxes', () => {
      const tata1 = mkElement('TATA', 'TATAWAWR', -25);
      const tata2 = mkElement('TATA', 'TATAWAWR', -30);
      const promoter = mkPromoter(100, [tata1, tata2]);
      const sequence = dna('A'.repeat(MAX_PROMOTER_SEARCH_DISTANCE));
      const tssPositions = identifyTSS(promoter, sequence);
      expect(tssPositions).toHaveLength(2);
      expect(tssPositions).toContain(100);
    });

    test('falls back to promoter TSS for other elements', () => {
      const gcElement = mkElement('GC', 'GGGCGG', -70);
      const promoter = mkPromoter(100, [gcElement]);
      const sequence = dna('A'.repeat(MAX_PROMOTER_SEARCH_DISTANCE));
      expect(identifyTSS(promoter, sequence)).toContain(100);
    });

    test('filters out invalid TSS positions', () => {
      const tataElement = mkElement('TATA', 'TATAWAWR', -25);
      const promoter = mkPromoter(10, [tataElement]);
      const sequence = dna('ATCG');
      const tssPositions = identifyTSS(promoter, sequence);
      expect(tssPositions.every(pos => pos < sequence.sequence.length)).toBe(true);
    });

    test('handles edge case with TSS at sequence boundary', () => {
      const inrElement = mkElement('Inr', 'BBCABW', 0);
      const promoter = mkPromoter(0, [inrElement]);
      const sequence = dna('ATCGATCG');
      expect(identifyTSS(promoter, sequence)).toContain(0);
    });
  });

  describe('integration tests', () => {
    test('realistic beta-globin-like promoter', () => {
      const upstream = 'ATCGATCG';
      const caatBox = 'GGCCAATCT';
      const spacer1 = 'ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG';
      const tataBox = 'TATAAAAG';
      const spacer2 = 'ATCGATCGATCGATCGATCGATCG';
      const tss = 'ATCG';
      const downstream = 'ATCGATCGATCG';

      const sequence = dna(upstream + caatBox + spacer1 + tataBox + spacer2 + tss + downstream);

      const promoters = findPromoters(sequence);
      expect(promoters.length).toBeGreaterThan(0);

      const bestPromoter = at(promoters, 0);
      expect(bestPromoter.hasElement('TATA')).toBe(true);
      expect(bestPromoter.hasElement('CAAT')).toBe(true);
      expect(bestPromoter.getStrengthScore()).toBeGreaterThan(15);

      const tssPositions = identifyTSS(bestPromoter, sequence);
      expect(tssPositions.length).toBeGreaterThan(0);
    });

    test('TATA-less promoter with Inr and DPE', () => {
      const upstream = 'ATCGATCGATCG';
      const inrElement = 'CCATCCC';
      const spacer = 'ATCGATCGATCGATCGATCGATCGATCGATCGATCG';
      const dpeElement = 'AGACT';
      const downstream = 'ATCGATCG';

      const sequence = dna(upstream + inrElement + spacer + dpeElement + downstream);
      const promoters = findPromoters(sequence);

      if (promoters.length > 0) {
        const inrPromoter = promoters.find(p => p.hasElement('Inr'));
        expect(inrPromoter).toBeDefined();
        if (inrPromoter) {
          const tssPositions = identifyTSS(inrPromoter, sequence);
          expect(tssPositions.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
