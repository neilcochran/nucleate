import {
  AMINO_ACIDS,
  AMINO_ACID_BY_CODON,
  AMINO_ACID_BY_SINGLE_LETTER,
  AminoAcidCharge,
  AminoAcidPolarity,
  AminoAcidSideChainType,
  getAminoAcidDataByCodon,
  getAminoAcidDataBySingleLetter,
} from '../../src/translation';
import { STOP_CODONS } from '../../src/sequence';
import { at } from '../utils/test-utils';

describe('AMINO_ACIDS canonical list', () => {
  test('contains all 20 standard proteinogenic amino acids', () => {
    const expected = [
      'A',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'K',
      'L',
      'M',
      'N',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'V',
      'W',
      'Y',
    ];
    expect(AMINO_ACIDS).toHaveLength(20);
    expect(AMINO_ACIDS.map(a => a.singleLetterCode).sort()).toEqual(expected.sort());
  });

  test('every amino-acid entry carries the full data shape', () => {
    for (const aa of AMINO_ACIDS) {
      expect(typeof aa.name).toBe('string');
      expect(typeof aa.threeLetterCode).toBe('string');
      expect(typeof aa.singleLetterCode).toBe('string');
      expect(typeof aa.molecularWeight).toBe('number');
      expect(aa.molecularWeight).toBeGreaterThan(0);
      expect(Object.values(AminoAcidPolarity)).toContain(aa.polarity);
      expect(Object.values(AminoAcidCharge)).toContain(aa.charge);
      expect(Object.values(AminoAcidSideChainType)).toContain(aa.sideChainType);
      expect(typeof aa.hydrophobicity).toBe('number');
      expect(aa.codons.length).toBeGreaterThan(0);
    }
  });

  test('codons appear once across all amino-acid entries', () => {
    const seen = new Set<string>();
    let total = 0;
    for (const aa of AMINO_ACIDS) {
      for (const codon of aa.codons) {
        expect(seen.has(codon)).toBe(false);
        seen.add(codon);
        total += 1;
      }
    }
    // 61 sense codons (64 minus the 3 stop codons)
    expect(total).toBe(61);
  });

  test('stop codons are absent from every amino-acid entry', () => {
    for (const aa of AMINO_ACIDS) {
      for (const stop of STOP_CODONS) {
        expect(aa.codons).not.toContain(stop);
      }
    }
  });

  test('names match the standard biochemistry', () => {
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'A').name).toBe('Alanine');
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'M').name).toBe('Methionine');
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'W').name).toBe('Tryptophan');
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'Y').name).toBe('Tyrosine');
  });

  test('three-letter codes match the standard biochemistry', () => {
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'A').threeLetterCode).toBe('Ala');
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'M').threeLetterCode).toBe('Met');
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'D').threeLetterCode).toBe('Asp');
  });

  test('charged amino acids carry the right charge enum', () => {
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'D').charge).toBe(AminoAcidCharge.NEGATIVE);
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'E').charge).toBe(AminoAcidCharge.NEGATIVE);
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'K').charge).toBe(AminoAcidCharge.POSITIVE);
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'R').charge).toBe(AminoAcidCharge.POSITIVE);
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'H').charge).toBe(AminoAcidCharge.POSITIVE);
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'A').charge).toBe(AminoAcidCharge.NEUTRAL);
  });
});

describe('derived codon lookup maps', () => {
  test('AMINO_ACID_BY_CODON has all 61 sense codons', () => {
    expect(Object.keys(AMINO_ACID_BY_CODON)).toHaveLength(61);
    for (const codon of Object.keys(AMINO_ACID_BY_CODON)) {
      expect(codon).toMatch(/^[ACGU]{3}$/);
    }
  });

  test('AUG maps to Methionine', () => {
    expect(at(AMINO_ACID_BY_CODON, 'AUG').singleLetterCode).toBe('M');
  });

  test('stop codons have no entry in AMINO_ACID_BY_CODON', () => {
    for (const stop of STOP_CODONS) {
      expect(AMINO_ACID_BY_CODON[stop]).toBeUndefined();
    }
  });

  test('alternate codons all resolve to the same data reference', () => {
    const alanine = at(AMINO_ACID_BY_SINGLE_LETTER, 'A');
    for (const codon of alanine.codons) {
      expect(AMINO_ACID_BY_CODON[codon]).toBe(alanine);
    }
  });

  test('lookup maps are derived from AMINO_ACIDS (single source of truth)', () => {
    for (const aa of AMINO_ACIDS) {
      expect(AMINO_ACID_BY_SINGLE_LETTER[aa.singleLetterCode]).toBe(aa);
      for (const codon of aa.codons) {
        expect(AMINO_ACID_BY_CODON[codon]).toBe(aa);
      }
    }
  });

  test('getAminoAcidDataByCodon returns the matching entry', () => {
    expect(getAminoAcidDataByCodon('AUG')?.singleLetterCode).toBe('M');
    expect(getAminoAcidDataByCodon('GCA')?.singleLetterCode).toBe('A');
  });

  test('getAminoAcidDataByCodon returns undefined for stop codons', () => {
    for (const stop of STOP_CODONS) {
      expect(getAminoAcidDataByCodon(stop)).toBeUndefined();
    }
  });

  test('getAminoAcidDataByCodon returns undefined for malformed codons', () => {
    expect(getAminoAcidDataByCodon('AU')).toBeUndefined();
    expect(getAminoAcidDataByCodon('AUGG')).toBeUndefined();
    expect(getAminoAcidDataByCodon('XYZ')).toBeUndefined();
  });

  test('getAminoAcidDataBySingleLetter returns the matching entry', () => {
    expect(getAminoAcidDataBySingleLetter('M')?.name).toBe('Methionine');
  });

  test('getAminoAcidDataBySingleLetter returns undefined for unknown codes', () => {
    expect(getAminoAcidDataBySingleLetter('X')).toBeUndefined();
    expect(getAminoAcidDataBySingleLetter('')).toBeUndefined();
  });
});

describe('degeneracy expectations', () => {
  test('methionine and tryptophan have a single codon each', () => {
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'M').codons).toEqual(['AUG']);
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'W').codons).toEqual(['UGG']);
  });

  test('leucine, serine, and arginine have six codons each', () => {
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'L').codons).toHaveLength(6);
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'S').codons).toHaveLength(6);
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'R').codons).toHaveLength(6);
  });

  test('isoleucine has three codons', () => {
    expect(at(AMINO_ACID_BY_SINGLE_LETTER, 'I').codons).toHaveLength(3);
  });
});
