import type { RNA } from '../../src/sequence';
import { AminoAcid } from '../../src/translation';
import { parseMRNA } from '../../src/modifications';
import type { MRNA } from '../../src/modifications';
import { at } from '../../src/result';

// Re-export the production `at` indexed-access helper so test modules can keep importing it from
// this single test-utility entry point.
export { at };

/**
 * Returns an mRNA's coding sequence, throwing when the mRNA has no CDS. For tests that build
 * CDS-bearing mRNAs (the default `processRNA` path) and want a non-optional handle to assert on,
 * now that {@link MRNA.codingSequence} is `RNA | undefined`.
 *
 * @param mRNA - The mRNA expected to carry a coding sequence
 * @returns The coding sequence as RNA
 * @throws If the mRNA has no coding sequence
 */
export function requireCodingSequence(mRNA: MRNA): RNA {
  if (mRNA.codingSequence === undefined) {
    throw new Error('Test expected mRNA to carry a coding sequence, but it has none');
  }
  return mRNA.codingSequence;
}

// MRNA versions for Polypeptide tests - use the coding sequences directly
export const MRNA_ALL_AMINO_ACIDS_1 = parseMRNA(
  'GCAUGCGACGAAUUCGGACACAUAAAAUUAAUGAACCCACAAAGAAGCACAGUAUGGUAC',
  0,
  60,
).unwrap();

export const MRNA_ALL_AMINO_ACIDS_2 = parseMRNA(
  'GCCUGUGAUGAGUUUGGCCAUAUCAAGUUGAUGAAUCCCCAGAGGAGUACCGUCUGGUAU',
  0,
  60,
).unwrap();

// The single-letter amino acid sequence the MRNA_ALL_AMINO_ACIDS_* fixtures translate to
// (all 20 amino acids, alphabetical by single-letter code).
export const ALL_AMINO_ACIDS_SINGLE_LETTER_CODE_SEQ = 'ACDEFGHIKLMNPQRSTVWY';

export const isCorrectAminoAcidSequence = (
  aminoAcidSequence: readonly AminoAcid[],
  correctSingleLetterCodeSequence: string,
): boolean => {
  if (aminoAcidSequence.length !== correctSingleLetterCodeSequence.length) {
    return false;
  }
  for (let i = 0; i < correctSingleLetterCodeSequence.length; i++) {
    if (at(aminoAcidSequence, i).data.singleLetterCode !== correctSingleLetterCodeSequence[i]) {
      return false;
    }
  }
  return true;
};
