import {
  parseAminoAcid,
  AminoAcidCharge,
  AminoAcidPolarity,
  AminoAcidSideChainType,
} from '../../src/translation';
import { RNA } from '../../src/sequence/RNA';
import { at } from '../utils/test-utils';

describe('AminoAcid (via parseAminoAcid)', () => {
  test('exposes biochemical data via the composed data field', () => {
    const met = parseAminoAcid('AUG').unwrap();
    expect(met.data.name).toBe('Methionine');
    expect(met.data.threeLetterCode).toBe('Met');
    expect(met.data.singleLetterCode).toBe('M');
    expect(met.data.molecularWeight).toBe(149.208);
    expect(met.data.polarity).toBe(AminoAcidPolarity.NONPOLAR);
    expect(met.data.charge).toBe(AminoAcidCharge.NEUTRAL);
    expect(met.data.sideChainType).toBe(AminoAcidSideChainType.SULFUR_CONTAINING);
  });

  test('exposes the codon as an RNA instance', () => {
    const met = parseAminoAcid('AUG').unwrap();
    expect(met.codon).toBeInstanceOf(RNA);
    expect(met.codon.sequence).toBe('AUG');
  });

  test('alternate-codon instances share the same data reference', () => {
    const a1 = parseAminoAcid('GCA').unwrap();
    const a2 = parseAminoAcid('GCC').unwrap();
    expect(a1.data).toBe(a2.data);
  });

  describe('getAllAlternateCodons', () => {
    test('returns every codon coding for the amino acid', () => {
      const phe = parseAminoAcid('UUU').unwrap();
      const sequences = phe.getAllAlternateCodons().map(c => c.sequence);
      expect(sequences.sort()).toEqual(['UUC', 'UUU'].sort());
    });

    test('returns a single codon for methionine', () => {
      const met = parseAminoAcid('AUG').unwrap();
      const codons = met.getAllAlternateCodons();
      expect(codons).toHaveLength(1);
      expect(at(codons, 0).sequence).toBe('AUG');
    });

    test('returns six codons for leucine', () => {
      const leu = parseAminoAcid('UUA').unwrap();
      expect(leu.getAllAlternateCodons()).toHaveLength(6);
    });

    test('returns RNA instances', () => {
      const ala = parseAminoAcid('GCA').unwrap();
      for (const codon of ala.getAllAlternateCodons()) {
        expect(codon).toBeInstanceOf(RNA);
        expect(codon.sequence).toMatch(/^[ACGU]{3}$/);
      }
    });
  });

  describe('equals', () => {
    test('returns true for identical residue and codon', () => {
      const a1 = parseAminoAcid('GCG').unwrap();
      const a2 = parseAminoAcid('GCG').unwrap();
      expect(a1.equals(a2)).toBe(true);
    });

    test('returns false for the same amino acid with different codons', () => {
      const a1 = parseAminoAcid('GCA').unwrap();
      const a2 = parseAminoAcid('GCC').unwrap();
      expect(a1.equals(a2)).toBe(false);
    });

    test('returns false for different amino acids', () => {
      const met = parseAminoAcid('AUG').unwrap();
      const phe = parseAminoAcid('UUU').unwrap();
      expect(met.equals(phe)).toBe(false);
    });

    test('is reflexive and symmetric', () => {
      const met = parseAminoAcid('AUG').unwrap();
      expect(met.equals(met)).toBe(true);
      const other = parseAminoAcid('AUG').unwrap();
      expect(met.equals(other)).toBe(other.equals(met));
    });
  });

  describe('isAlternateOf', () => {
    test('returns true for the same residue with different codons', () => {
      const a1 = parseAminoAcid('GCA').unwrap();
      const a2 = parseAminoAcid('GCC').unwrap();
      expect(a1.isAlternateOf(a2)).toBe(true);
      expect(a2.isAlternateOf(a1)).toBe(true);
    });

    test('returns false for the same residue and codon', () => {
      const a1 = parseAminoAcid('GCG').unwrap();
      const a2 = parseAminoAcid('GCG').unwrap();
      expect(a1.isAlternateOf(a2)).toBe(false);
    });

    test('returns false for different amino acids', () => {
      const met = parseAminoAcid('AUG').unwrap();
      const phe = parseAminoAcid('UUU').unwrap();
      expect(met.isAlternateOf(phe)).toBe(false);
    });
  });

  describe('charged and polar residues', () => {
    test('lysine carries a positive charge and basic side chain', () => {
      const lys = parseAminoAcid('AAA').unwrap();
      expect(lys.data.charge).toBe(AminoAcidCharge.POSITIVE);
      expect(lys.data.sideChainType).toBe(AminoAcidSideChainType.BASIC);
    });

    test('aspartic acid carries a negative charge and acidic side chain', () => {
      const asp = parseAminoAcid('GAU').unwrap();
      expect(asp.data.charge).toBe(AminoAcidCharge.NEGATIVE);
      expect(asp.data.sideChainType).toBe(AminoAcidSideChainType.ACIDIC);
    });

    test('serine is polar with a hydroxyl side chain', () => {
      const ser = parseAminoAcid('UCU').unwrap();
      expect(ser.data.polarity).toBe(AminoAcidPolarity.POLAR);
      expect(ser.data.sideChainType).toBe(AminoAcidSideChainType.HYDROXYL_CONTAINING);
    });

    test('aromatic residues share the aromatic side-chain classification', () => {
      for (const codon of ['UUC', 'UAU', 'UGG']) {
        const aa = parseAminoAcid(codon).unwrap();
        expect(aa.data.sideChainType).toBe(AminoAcidSideChainType.AROMATIC);
      }
    });
  });
});
