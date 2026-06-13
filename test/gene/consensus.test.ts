import {
  TATA_BOX,
  INITIATOR,
  DOWNSTREAM_PROMOTER_ELEMENT,
  CAAT_BOX,
  GC_BOX,
  CEBP_SITE,
  E_BOX,
  AP1_SITE,
  STANDARD_PROMOTER_ELEMENTS,
  CORE_PROMOTER_ELEMENTS,
  PROXIMAL_PROMOTER_ELEMENTS,
  PROMOTER_ELEMENT_COMBINATIONS,
} from '../../src/gene';

describe('Promoter consensus instances', () => {
  describe('individual elements', () => {
    test('TATA_BOX has correct properties and score weight', () => {
      expect(TATA_BOX.name).toBe('TATA');
      expect(TATA_BOX.position).toBe(-25);
      expect(TATA_BOX.pattern.pattern).toBe('TATAWAR');
      expect(TATA_BOX.scoreWeight).toBe(10);
    });

    test('INITIATOR has correct properties and score weight', () => {
      expect(INITIATOR.name).toBe('Inr');
      expect(INITIATOR.position).toBe(0);
      expect(INITIATOR.pattern.pattern).toBe('BBCABW');
      expect(INITIATOR.scoreWeight).toBe(8);
    });

    test('DOWNSTREAM_PROMOTER_ELEMENT has correct properties and score weight', () => {
      expect(DOWNSTREAM_PROMOTER_ELEMENT.name).toBe('DPE');
      expect(DOWNSTREAM_PROMOTER_ELEMENT.position).toBe(30);
      expect(DOWNSTREAM_PROMOTER_ELEMENT.pattern.pattern).toBe('RGWYV');
      expect(DOWNSTREAM_PROMOTER_ELEMENT.scoreWeight).toBe(6);
    });

    test('CAAT_BOX has correct properties and score weight', () => {
      expect(CAAT_BOX.name).toBe('CAAT');
      expect(CAAT_BOX.position).toBe(-75);
      expect(CAAT_BOX.pattern.pattern).toBe('GGCCAATCT');
      expect(CAAT_BOX.scoreWeight).toBe(5);
    });

    test('GC_BOX has correct properties and score weight', () => {
      expect(GC_BOX.name).toBe('GC');
      expect(GC_BOX.position).toBe(-70);
      expect(GC_BOX.pattern.pattern).toBe('GGGCGG');
      expect(GC_BOX.scoreWeight).toBe(4);
    });

    test('CEBP_SITE has correct properties', () => {
      expect(CEBP_SITE.name).toBe('C/EBP');
      expect(CEBP_SITE.position).toBe(-50);
      expect(CEBP_SITE.pattern.pattern).toBe('RTTGCGYAAY');
      expect(CEBP_SITE.scoreWeight).toBe(0);
    });

    test('E_BOX has correct properties', () => {
      expect(E_BOX.name).toBe('E-box');
      expect(E_BOX.position).toBe(-60);
      expect(E_BOX.pattern.pattern).toBe('CANNTG');
      expect(E_BOX.scoreWeight).toBe(0);
    });

    test('AP1_SITE has correct properties', () => {
      expect(AP1_SITE.name).toBe('AP-1');
      expect(AP1_SITE.position).toBe(-40);
      expect(AP1_SITE.pattern.pattern).toBe('TGASTCA');
      expect(AP1_SITE.scoreWeight).toBe(0);
    });
  });

  describe('element collections', () => {
    test('STANDARD_PROMOTER_ELEMENTS contains all 8 elements', () => {
      expect(STANDARD_PROMOTER_ELEMENTS).toHaveLength(8);
      const names = STANDARD_PROMOTER_ELEMENTS.map(e => e.name);
      for (const expected of ['TATA', 'Inr', 'DPE', 'CAAT', 'GC', 'C/EBP', 'E-box', 'AP-1']) {
        expect(names).toContain(expected);
      }
    });

    test('CORE_PROMOTER_ELEMENTS contains only core elements', () => {
      expect(CORE_PROMOTER_ELEMENTS).toHaveLength(3);
      expect(CORE_PROMOTER_ELEMENTS.map(e => e.name)).toEqual(['TATA', 'Inr', 'DPE']);
    });

    test('PROXIMAL_PROMOTER_ELEMENTS contains only proximal regulatory elements', () => {
      expect(PROXIMAL_PROMOTER_ELEMENTS).toHaveLength(5);
      const names = PROXIMAL_PROMOTER_ELEMENTS.map(e => e.name);
      for (const expected of ['CAAT', 'GC', 'C/EBP', 'E-box', 'AP-1']) {
        expect(names).toContain(expected);
      }
    });

    test('core and proximal sets are disjoint', () => {
      const core = new Set(CORE_PROMOTER_ELEMENTS.map(e => e.name));
      const proximal = new Set(PROXIMAL_PROMOTER_ELEMENTS.map(e => e.name));
      const intersection = [...core].filter(n => proximal.has(n));
      expect(intersection).toEqual([]);
    });
  });

  describe('PROMOTER_ELEMENT_COMBINATIONS', () => {
    test('TATA_DEPENDENT contains only TATA', () => {
      expect(PROMOTER_ELEMENT_COMBINATIONS.TATA_DEPENDENT).toEqual([TATA_BOX]);
    });

    test('TATA_LESS contains Inr and DPE', () => {
      expect(PROMOTER_ELEMENT_COMBINATIONS.TATA_LESS).toEqual([
        INITIATOR,
        DOWNSTREAM_PROMOTER_ELEMENT,
      ]);
    });

    test('STRONG_PROMOTER bundles TATA + CAAT + GC', () => {
      expect(PROMOTER_ELEMENT_COMBINATIONS.STRONG_PROMOTER).toEqual([TATA_BOX, CAAT_BOX, GC_BOX]);
    });

    test('HOUSEKEEPING bundles GC + Inr', () => {
      expect(PROMOTER_ELEMENT_COMBINATIONS.HOUSEKEEPING).toEqual([GC_BOX, INITIATOR]);
    });

    test('TISSUE_SPECIFIC bundles E-box + C/EBP + AP-1', () => {
      expect(PROMOTER_ELEMENT_COMBINATIONS.TISSUE_SPECIFIC).toEqual([E_BOX, CEBP_SITE, AP1_SITE]);
    });
  });

  describe('biological accuracy', () => {
    test('TATA box is 20-35 bp upstream of TSS', () => {
      expect(TATA_BOX.position).toBeLessThan(0);
      expect(Math.abs(TATA_BOX.position)).toBeGreaterThanOrEqual(20);
      expect(Math.abs(TATA_BOX.position)).toBeLessThanOrEqual(35);
    });

    test('Initiator overlaps TSS', () => {
      expect(Math.abs(INITIATOR.position)).toBeLessThanOrEqual(5);
    });

    test('DPE is downstream of TSS within 50 bp', () => {
      expect(DOWNSTREAM_PROMOTER_ELEMENT.position).toBeGreaterThan(0);
      expect(DOWNSTREAM_PROMOTER_ELEMENT.position).toBeLessThanOrEqual(50);
    });

    test('proximal elements are upstream of TSS', () => {
      for (const el of [CAAT_BOX, GC_BOX, CEBP_SITE, E_BOX, AP1_SITE]) {
        expect(el.position).toBeLessThan(0);
        expect(Math.abs(el.position)).toBeLessThanOrEqual(200);
      }
    });
  });
});
