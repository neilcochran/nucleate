import { translate } from '../../src/translation';
import { parseMRNA } from '../../src/modifications';
import { STOP_CODONS } from '../../src/sequence';
import {
  MRNA_ALL_AMINO_ACIDS_1,
  MRNA_ALL_AMINO_ACIDS_2,
  ALL_AMINO_ACIDS_SINGLE_LETTER_CODE_SEQ,
  isCorrectAminoAcidSequence,
  at,
} from '../utils/test-utils';

describe('translate', () => {
  test('translates a simple mRNA with start, sense codons, and stop', () => {
    const mRNA = parseMRNA('AUGAAACCCUAG', 0, 12).unwrap();
    const result = translate(mRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      const aas = result.data.aminoAcids;
      expect(aas.map(a => a.data.singleLetterCode).join('')).toBe('MKP');
    }
  });

  test('stops translation at the first in-frame stop codon', () => {
    const mRNA = parseMRNA('AUGAAAUAGCCC', 0, 12).unwrap();
    const result = translate(mRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      const aas = result.data.aminoAcids;
      expect(aas).toHaveLength(2);
      expect(at(aas, 0).data.singleLetterCode).toBe('M');
      expect(at(aas, 1).data.singleLetterCode).toBe('K');
    }
  });

  test.each(STOP_CODONS)('stop codon %s terminates translation', stop => {
    const mRNA = parseMRNA(`AUGAAACCC${stop}`, 0, 12).unwrap();
    const result = translate(mRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aminoAcids).toHaveLength(3);
    }
  });

  test('coding sequence that begins with a stop yields an empty polypeptide', () => {
    const mRNA = parseMRNA('UAGAAACCC', 0, 9).unwrap();
    const result = translate(mRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aminoAcids).toHaveLength(0);
    }
  });

  test('fails with invalid-reading-frame when coding length is not divisible by 3', () => {
    // parseMRNA accepts any coding boundaries; the reading-frame check belongs to translate.
    const mRNA = parseMRNA('AUGAA', 0, 5).unwrap();
    const result = translate(mRNA);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'invalid-reading-frame') {
      expect(result.error.codingLength).toBe(5);
      expect(result.error.codonLength).toBe(3);
    }
  });

  test('fails with no-coding-sequence when the mRNA has no CDS', () => {
    const mRNA = parseMRNA('AAACCCGGGUUU').unwrap();
    const result = translate(mRNA);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('no-coding-sequence');
    }
  });

  test('preserves the source mRNA on the polypeptide', () => {
    const mRNA = parseMRNA('AUGAAACCCUAG', 0, 12).unwrap();
    const result = translate(mRNA).unwrap();
    expect(result.mRNA).toBe(mRNA);
  });

  test('translates the canonical 20-amino-acid fixture (codon set 1)', () => {
    const result = translate(MRNA_ALL_AMINO_ACIDS_1).unwrap();
    expect(
      isCorrectAminoAcidSequence(result.aminoAcids, ALL_AMINO_ACIDS_SINGLE_LETTER_CODE_SEQ),
    ).toBe(true);
  });

  test('translates the canonical 20-amino-acid fixture (alternate codon set)', () => {
    const result = translate(MRNA_ALL_AMINO_ACIDS_2).unwrap();
    expect(
      isCorrectAminoAcidSequence(result.aminoAcids, ALL_AMINO_ACIDS_SINGLE_LETTER_CODE_SEQ),
    ).toBe(true);
  });
});
