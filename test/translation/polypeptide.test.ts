import { translate, AminoAcidSideChainType, WATER_AVERAGE_MASS } from '../../src/translation';
import type { Polypeptide } from '../../src/translation';
import { parseMRNA } from '../../src/modifications';
import {
  MRNA_ALL_AMINO_ACIDS_1,
  ALL_AMINO_ACIDS_SINGLE_LETTER_CODE_SEQ,
  at,
} from '../utils/test-utils';

function poly(codingRNA: string): Polypeptide {
  return translate(parseMRNA(codingRNA, 0, codingRNA.length).unwrap()).unwrap();
}

describe('Polypeptide', () => {
  test('aminoAcids is read out of the translate result', () => {
    const mRNA = parseMRNA('AUGAAACCCUAG', 0, 12).unwrap();
    const poly = translate(mRNA).unwrap();
    expect(poly.aminoAcids).toHaveLength(3);
    expect(at(poly.aminoAcids, 0).data.singleLetterCode).toBe('M');
    expect(at(poly.aminoAcids, 1).data.singleLetterCode).toBe('K');
    expect(at(poly.aminoAcids, 2).data.singleLetterCode).toBe('P');
  });

  test('length reports the amino-acid count, terminating at the first stop', () => {
    expect(poly('AUGAAACCCUAG').length).toBe(3); // M, K, P then UAG stop
    expect(poly('UAGAAACCC').length).toBe(0); // immediate stop codon
  });

  describe('getSequence', () => {
    test('joins single-letter codes', () => {
      const mRNA = parseMRNA('AUGAAACCCUAG', 0, 12).unwrap();
      const poly = translate(mRNA).unwrap();
      expect(poly.getSequence()).toBe('MKP');
    });

    test('returns the canonical 20-amino-acid sequence for the canonical fixture', () => {
      const poly = translate(MRNA_ALL_AMINO_ACIDS_1).unwrap();
      expect(poly.getSequence()).toBe(ALL_AMINO_ACIDS_SINGLE_LETTER_CODE_SEQ);
    });

    test('returns an empty string when the first codon is a stop', () => {
      const mRNA = parseMRNA('UAGAAACCC', 0, 9).unwrap();
      const poly = translate(mRNA).unwrap();
      expect(poly.getSequence()).toBe('');
    });
  });

  describe('contains / startsWith / endsWith (Polypeptide-only)', () => {
    const mkp = poly('AUGAAACCCUAG'); // 'MKP'

    test('contains finds an interior subsequence', () => {
      expect(mkp.contains(poly('AAACCCUAG'))).toBe(true); // 'KP'
      expect(mkp.contains(poly('GGGUAG'))).toBe(false); // 'G' not in 'MKP'
    });

    test('contains is true for an empty polypeptide', () => {
      expect(mkp.contains(poly('UAG'))).toBe(true);
    });

    test('startsWith matches a prefix', () => {
      expect(mkp.startsWith(poly('AUGUAG'))).toBe(true); // 'M'
      expect(mkp.startsWith(poly('AUGAAAUAG'))).toBe(true); // 'MK'
      expect(mkp.startsWith(poly('AAAUAG'))).toBe(false); // 'K' does not start 'MKP'
    });

    test('endsWith matches a suffix', () => {
      expect(mkp.endsWith(poly('CCCUAG'))).toBe(true); // 'P'
      expect(mkp.endsWith(poly('AAACCCUAG'))).toBe(true); // 'KP'
      expect(mkp.endsWith(poly('AUGUAG'))).toBe(false); // 'M' does not end 'MKP'
    });
  });

  describe('indexOf (Polypeptide-only)', () => {
    const mkgk = poly('AUGAAAGGGAAAUAG'); // 'MKGK'

    test('finds the first occurrence', () => {
      expect(mkgk.indexOf(poly('AAAUAG'))).toBe(1); // 'K'
    });

    test('respects the startPosition argument', () => {
      expect(mkgk.indexOf(poly('AAAUAG'), 2)).toBe(3); // 'K' from position 2
    });

    test('returns -1 for a missing subsequence', () => {
      expect(mkgk.indexOf(poly('CCCUAG'))).toBe(-1); // 'P' not in 'MKGK'
    });
  });

  describe('immutability', () => {
    test('aminoAcids and mRNA fields read consistently', () => {
      const poly = translate(MRNA_ALL_AMINO_ACIDS_1).unwrap();
      const ref = poly.aminoAcids;
      expect(poly.aminoAcids).toBe(ref);
      expect(poly.mRNA).toBe(MRNA_ALL_AMINO_ACIDS_1);
    });
  });

  describe('biochemical aggregates', () => {
    test('molecularWeight sums residue masses minus one water per peptide bond', () => {
      // M + K + P, joined by two peptide bonds (two waters lost).
      const expected = 149.208 + 146.189 + 115.132 - 2 * WATER_AVERAGE_MASS;
      expect(poly('AUGAAACCCUAG').molecularWeight()).toBeCloseTo(expected, 5);
    });

    test('molecularWeight of a single residue is the free amino-acid mass', () => {
      expect(poly('AUGUAA').molecularWeight()).toBeCloseTo(149.208, 5); // M only, no water lost
    });

    test('molecularWeight of an empty polypeptide is 0', () => {
      expect(poly('UAGAAACCC').molecularWeight()).toBe(0);
    });

    test('meanHydrophobicity averages the Kyte-Doolittle scores', () => {
      // M 1.9, K -3.9, P -1.6 -> mean -1.2
      expect(poly('AUGAAACCCUAG').meanHydrophobicity()).toBeCloseTo(-1.2, 5);
    });

    test('meanHydrophobicity of an empty polypeptide is 0', () => {
      expect(poly('UAGAAACCC').meanHydrophobicity()).toBe(0);
    });

    test('netChargeAtPhysiologicalPH sums side-chain charges', () => {
      expect(poly('AUGAAACCCUAG').netChargeAtPhysiologicalPH()).toBe(1); // K is +1
      // M(0) D(-1) K(+1) E(-1) -> -1
      expect(poly('AUGGAUAAAGAAUAA').netChargeAtPhysiologicalPH()).toBe(-1);
    });

    test('netChargeAtPhysiologicalPH of an empty polypeptide is 0', () => {
      expect(poly('UAGAAACCC').netChargeAtPhysiologicalPH()).toBe(0);
    });

    test('composition counts residues by amino acid and side-chain class', () => {
      const comp = poly('AUGAAACCCUAG').composition(); // MKP
      expect(comp.byAminoAcid).toEqual({ M: 1, K: 1, P: 1 });
      expect(comp.bySideChainType[AminoAcidSideChainType.SULFUR_CONTAINING]).toBe(1);
      expect(comp.bySideChainType[AminoAcidSideChainType.BASIC]).toBe(1);
      expect(comp.bySideChainType[AminoAcidSideChainType.IMINO]).toBe(1);
    });

    test('composition tallies repeated residues', () => {
      const comp = poly('AUGAAAAAAUAA').composition(); // MKK
      expect(comp.byAminoAcid).toEqual({ M: 1, K: 2 });
      expect(comp.bySideChainType[AminoAcidSideChainType.BASIC]).toBe(2);
    });
  });
});
