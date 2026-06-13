import type { AminoAcidData } from './AminoAcidData.js';
import { AminoAcidCharge, AminoAcidPolarity, AminoAcidSideChainType } from './enums.js';

/**
 * Average molecular mass of water (H2O) in Daltons. One water molecule is released per peptide
 * bond formed, so a polypeptide of `n` residues weighs the sum of its free amino-acid masses
 * minus `(n - 1)` of these. Average mass (not monoisotopic), matching the average free-amino-acid
 * masses carried by {@link AminoAcidData.molecularWeight}.
 */
export const WATER_AVERAGE_MASS = 18.01528;

/**
 * Canonical list of the 20 proteinogenic amino acids with their biochemical properties and
 * the RNA codons that code for them. This is the single source of truth for the genetic
 * code: the codon-to-amino-acid and single-letter-to-amino-acid lookup maps are derived from
 * this list at module load.
 *
 * Stop codons (`UAA`, `UAG`, `UGA`) are intentionally absent; they live in
 * `sequence/codons.ts` as the `STOP_CODONS` set and the `StopCodon` type.
 */
export const AMINO_ACIDS: readonly AminoAcidData[] = Object.freeze([
  {
    name: 'Alanine',
    threeLetterCode: 'Ala',
    singleLetterCode: 'A',
    molecularWeight: 89.094,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: 1.8,
    sideChainType: AminoAcidSideChainType.ALIPHATIC,
    codons: Object.freeze(['GCA', 'GCC', 'GCG', 'GCU']),
  },
  {
    name: 'Cysteine',
    threeLetterCode: 'Cys',
    singleLetterCode: 'C',
    molecularWeight: 121.154,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: 2.5,
    sideChainType: AminoAcidSideChainType.SULFUR_CONTAINING,
    codons: Object.freeze(['UGC', 'UGU']),
  },
  {
    name: 'Aspartic acid',
    threeLetterCode: 'Asp',
    singleLetterCode: 'D',
    molecularWeight: 133.104,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.NEGATIVE,
    hydrophobicity: -3.5,
    sideChainType: AminoAcidSideChainType.ACIDIC,
    codons: Object.freeze(['GAC', 'GAU']),
  },
  {
    name: 'Glutamic acid',
    threeLetterCode: 'Glu',
    singleLetterCode: 'E',
    molecularWeight: 147.131,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.NEGATIVE,
    hydrophobicity: -3.5,
    sideChainType: AminoAcidSideChainType.ACIDIC,
    codons: Object.freeze(['GAA', 'GAG']),
  },
  {
    name: 'Phenylalanine',
    threeLetterCode: 'Phe',
    singleLetterCode: 'F',
    molecularWeight: 165.192,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: 2.8,
    sideChainType: AminoAcidSideChainType.AROMATIC,
    codons: Object.freeze(['UUC', 'UUU']),
  },
  {
    name: 'Glycine',
    threeLetterCode: 'Gly',
    singleLetterCode: 'G',
    molecularWeight: 75.067,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: -0.4,
    sideChainType: AminoAcidSideChainType.ALIPHATIC,
    codons: Object.freeze(['GGA', 'GGC', 'GGG', 'GGU']),
  },
  {
    name: 'Histidine',
    threeLetterCode: 'His',
    singleLetterCode: 'H',
    molecularWeight: 155.156,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.POSITIVE,
    hydrophobicity: -3.2,
    sideChainType: AminoAcidSideChainType.BASIC,
    codons: Object.freeze(['CAC', 'CAU']),
  },
  {
    name: 'Isoleucine',
    threeLetterCode: 'Ile',
    singleLetterCode: 'I',
    molecularWeight: 131.175,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: 4.5,
    sideChainType: AminoAcidSideChainType.ALIPHATIC,
    codons: Object.freeze(['AUA', 'AUC', 'AUU']),
  },
  {
    name: 'Lysine',
    threeLetterCode: 'Lys',
    singleLetterCode: 'K',
    molecularWeight: 146.189,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.POSITIVE,
    hydrophobicity: -3.9,
    sideChainType: AminoAcidSideChainType.BASIC,
    codons: Object.freeze(['AAA', 'AAG']),
  },
  {
    name: 'Leucine',
    threeLetterCode: 'Leu',
    singleLetterCode: 'L',
    molecularWeight: 131.175,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: 3.8,
    sideChainType: AminoAcidSideChainType.ALIPHATIC,
    codons: Object.freeze(['UUA', 'UUG', 'CUA', 'CUC', 'CUG', 'CUU']),
  },
  {
    name: 'Methionine',
    threeLetterCode: 'Met',
    singleLetterCode: 'M',
    molecularWeight: 149.208,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: 1.9,
    sideChainType: AminoAcidSideChainType.SULFUR_CONTAINING,
    codons: Object.freeze(['AUG']),
  },
  {
    name: 'Asparagine',
    threeLetterCode: 'Asn',
    singleLetterCode: 'N',
    molecularWeight: 132.119,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: -3.5,
    sideChainType: AminoAcidSideChainType.AMIDE,
    codons: Object.freeze(['AAC', 'AAU']),
  },
  {
    name: 'Proline',
    threeLetterCode: 'Pro',
    singleLetterCode: 'P',
    molecularWeight: 115.132,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: -1.6,
    sideChainType: AminoAcidSideChainType.IMINO,
    codons: Object.freeze(['CCA', 'CCC', 'CCG', 'CCU']),
  },
  {
    name: 'Glutamine',
    threeLetterCode: 'Gln',
    singleLetterCode: 'Q',
    molecularWeight: 146.146,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: -3.5,
    sideChainType: AminoAcidSideChainType.AMIDE,
    codons: Object.freeze(['CAA', 'CAG']),
  },
  {
    name: 'Arginine',
    threeLetterCode: 'Arg',
    singleLetterCode: 'R',
    molecularWeight: 174.203,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.POSITIVE,
    hydrophobicity: -4.5,
    sideChainType: AminoAcidSideChainType.BASIC,
    codons: Object.freeze(['AGA', 'AGG', 'CGA', 'CGC', 'CGG', 'CGU']),
  },
  {
    name: 'Serine',
    threeLetterCode: 'Ser',
    singleLetterCode: 'S',
    molecularWeight: 105.093,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: -0.8,
    sideChainType: AminoAcidSideChainType.HYDROXYL_CONTAINING,
    codons: Object.freeze(['AGC', 'AGU', 'UCA', 'UCC', 'UCG', 'UCU']),
  },
  {
    name: 'Threonine',
    threeLetterCode: 'Thr',
    singleLetterCode: 'T',
    molecularWeight: 119.119,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: -0.7,
    sideChainType: AminoAcidSideChainType.HYDROXYL_CONTAINING,
    codons: Object.freeze(['ACA', 'ACC', 'ACG', 'ACU']),
  },
  {
    name: 'Valine',
    threeLetterCode: 'Val',
    singleLetterCode: 'V',
    molecularWeight: 131.175,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: 4.2,
    sideChainType: AminoAcidSideChainType.ALIPHATIC,
    codons: Object.freeze(['GUA', 'GUC', 'GUG', 'GUU']),
  },
  {
    name: 'Tryptophan',
    threeLetterCode: 'Trp',
    singleLetterCode: 'W',
    molecularWeight: 204.228,
    polarity: AminoAcidPolarity.NONPOLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: -0.9,
    sideChainType: AminoAcidSideChainType.AROMATIC,
    codons: Object.freeze(['UGG']),
  },
  {
    name: 'Tyrosine',
    threeLetterCode: 'Tyr',
    singleLetterCode: 'Y',
    molecularWeight: 181.191,
    polarity: AminoAcidPolarity.POLAR,
    charge: AminoAcidCharge.NEUTRAL,
    hydrophobicity: -1.3,
    sideChainType: AminoAcidSideChainType.AROMATIC,
    codons: Object.freeze(['UAC', 'UAU']),
  },
] as const);

function buildAminoAcidBySingleLetter(): Readonly<Record<string, AminoAcidData>> {
  const map: Record<string, AminoAcidData> = {};
  for (const aa of AMINO_ACIDS) {
    map[aa.singleLetterCode] = aa;
  }
  return Object.freeze(map);
}

function buildAminoAcidByCodon(): Readonly<Record<string, AminoAcidData>> {
  const map: Record<string, AminoAcidData> = {};
  for (const aa of AMINO_ACIDS) {
    for (const codon of aa.codons) {
      map[codon] = aa;
    }
  }
  return Object.freeze(map);
}

/**
 * Lookup of amino-acid data by single-letter code. Built once at module load from
 * {@link AMINO_ACIDS}; the keys are the 20 single-letter codes (`'A'`, `'C'`, ..., `'Y'`).
 *
 * @example
 * ```typescript
 * AMINO_ACID_BY_SINGLE_LETTER['M'].name; // 'Methionine'
 * ```
 */
export const AMINO_ACID_BY_SINGLE_LETTER: Readonly<Record<string, AminoAcidData>> =
  buildAminoAcidBySingleLetter();

/**
 * Lookup of amino-acid data by RNA codon. Built once at module load from {@link AMINO_ACIDS};
 * the keys are the 61 sense codons (stop codons are absent). Use {@link isStopCodon} to test
 * for stop codons.
 *
 * @example
 * ```typescript
 * AMINO_ACID_BY_CODON['AUG'].singleLetterCode;     // 'M'
 * AMINO_ACID_BY_CODON['UAA'];                      // undefined (stop codon)
 * ```
 */
export const AMINO_ACID_BY_CODON: Readonly<Record<string, AminoAcidData>> = buildAminoAcidByCodon();

/**
 * Returns the amino-acid data corresponding to an RNA codon, or `undefined` if the codon does
 * not code for an amino acid (wrong length, invalid alphabet, or stop codon).
 *
 * @param codon - The 3-character RNA codon to look up
 * @returns The {@link AminoAcidData} entry for the codon, or `undefined`
 *
 * @example
 * ```typescript
 * getAminoAcidDataByCodon('AUG')?.singleLetterCode; // 'M'
 * getAminoAcidDataByCodon('UAA');                   // undefined (stop)
 * getAminoAcidDataByCodon('AU');                    // undefined (wrong length)
 * ```
 */
export function getAminoAcidDataByCodon(codon: string): AminoAcidData | undefined {
  return AMINO_ACID_BY_CODON[codon];
}

/**
 * Returns the amino-acid data corresponding to a single-letter code, or `undefined` if the
 * code does not name a proteinogenic amino acid.
 *
 * @param singleLetterCode - The one-letter amino-acid code (e.g. `'M'`)
 * @returns The {@link AminoAcidData} entry, or `undefined`
 *
 * @example
 * ```typescript
 * getAminoAcidDataBySingleLetter('M')?.name; // 'Methionine'
 * getAminoAcidDataBySingleLetter('X');       // undefined
 * ```
 */
export function getAminoAcidDataBySingleLetter(
  singleLetterCode: string,
): AminoAcidData | undefined {
  return AMINO_ACID_BY_SINGLE_LETTER[singleLetterCode];
}
