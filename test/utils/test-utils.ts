import { parseDNA, parseRNA } from '../../src/sequence';
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

//ensure RNA and DNA sequences are the same (excluding base differences) since some tests rely it
export const RNA_SEQ = 'AUCGGCUA';
export const RNA_SEQ_COMP = 'UAGCCGAU';
export const DNA_SEQ = 'ATCGGCTA';
export const DNA_SEQ_COMP = 'TAGCCGAT';

export const ALANINE_RNA_CODON_1 = parseRNA('GCU').unwrap();
export const ALANINE_RNA_CODON_2 = parseRNA('GCG').unwrap();
export const ALANINE_DNA_CODON_1 = parseDNA('GCT').unwrap();
export const ALANINE_DNA_CODON_2 = parseDNA('GCG').unwrap();

//ALL_AMINO_ACIDS_1 vs ALL_AMINO_ACIDS_2 use alternate codons but will code for the same amino acid sequence
export const RNA_ALL_AMINO_ACIDS_1 = parseRNA(
  'GCAUGCGACGAAUUCGGACACAUAAAAUUAAUGAACCCACAAAGAAGCACAGUAUGGUAC',
).unwrap();
export const RNA_ALL_AMINO_ACIDS_2 = parseRNA(
  'GCCUGUGAUGAGUUUGGCCAUAUCAAGUUGAUGAAUCCCCAGAGGAGUACCGUCUGGUAU',
).unwrap();

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
export const DNA_ALL_AMINO_ACIDS_1 = parseDNA(
  'GCATGCGACGAATTCGGACACATAAAATTAATGAACCCACAAAGAAGCACAGTATGGTAC',
).unwrap();
export const DNA_ALL_AMINO_ACIDS_2 = parseDNA(
  'GCCTGTGATGAGTTTGGCCATATCAAGTTGATGAATCCCCAGAGGAGTACCGTCTGGTAT',
).unwrap();

//the sequence of amino acid SINGLE_LETTER_CODEs produced by the above codons (all amino acids in alphabetic order by SINGLE_LETTER_CODE)
export const ALL_AMINO_ACIDS_SINGLE_LETTER_CODE_SEQ = 'ACDEFGHIKLMNPQRSTVWY';

//Nucleotide pattern symbols and complement symbols strings
export const ALL_NUCLEOTIDE_SYMBOLS = 'ATCGURYKMSWBVDHN';
export const ALL_NUCLEOTIDE_SYMBOLS_COMP = 'TAGCAYRMKSWVBHDN';
export const NUCLEOTIDE_PATTERN = '^N*Y?A+(WY){3}$';
export const NUCLEOTIDE_PATTERN_COMP = '^N*R?T+(WR){3}$';
export const NUCLEOTIDE_PATTERN_REGEX = '^[AaGgCcTt]*[CcTt]?[Aa]+([AaTt][CcTt]){3}$';
export const NUCLEOTIDE_PATTERN_REGEX_COMP = '/^[AaGgCcTt]*[GgAa]?[Tt]+([AaTt][GgAa]){3}$/';
//Examples of sequences that pass the above regex
export const NUCLEOTIDE_PATTERN_PASSING_SEQS = [
  //N*             YA+ (WY){3}
  'ATCGATCGATCGATCGCAAATTTTTT',
  //N*             YA+ (WY){3}
  'ATCGATCGATCGATCGCAAAACTCTC',
  //N*              A+(WY){3}
  'ATCGATCGATCGATCGCAACTCTC',
  //N*A+(WY){3}
  'GAACTCTC',
  //N*YA+(WY){3}
  'GCAACTCTC',
  //N*YA+(WY){3}
  'GTAACTCTC',
];

export const isCorrectAminoAcid = (
  aminoAcid: AminoAcid,
  correctAminoAcidData: { name: string; threeLetterCode: string; singleLetterCode: string },
): boolean => {
  return (
    aminoAcid.data.name === correctAminoAcidData.name &&
    aminoAcid.data.threeLetterCode === correctAminoAcidData.threeLetterCode &&
    aminoAcid.data.singleLetterCode === correctAminoAcidData.singleLetterCode
  );
};

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
