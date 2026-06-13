import type { AminoAcidCharge, AminoAcidPolarity, AminoAcidSideChainType } from './enums.js';

/**
 * Immutable biochemical data for a single amino-acid type.
 *
 * One {@link AminoAcidData} entry exists per proteinogenic amino acid in the canonical
 * {@link AMINO_ACIDS} list. Codon-to-amino-acid and single-letter-to-codon lookup maps are
 * derived from that list at module load, so this interface is the single source of truth for
 * the codon table.
 */
export interface AminoAcidData {
  /** Full amino-acid name (e.g. `'Alanine'`). */
  readonly name: string;

  /** Standard three-letter code (e.g. `'Ala'`). */
  readonly threeLetterCode: string;

  /** Standard one-letter code (e.g. `'A'`). */
  readonly singleLetterCode: string;

  /** Average molecular weight of the free amino acid, in Daltons. */
  readonly molecularWeight: number;

  /** Side-chain polarity classification. */
  readonly polarity: AminoAcidPolarity;

  /** Net side-chain charge at physiological pH. */
  readonly charge: AminoAcidCharge;

  /**
   * Kyte-Doolittle hydrophobicity score. Positive values are hydrophobic; negative values are
   * hydrophilic.
   */
  readonly hydrophobicity: number;

  /** Chemical classification of the side chain. */
  readonly sideChainType: AminoAcidSideChainType;

  /**
   * All RNA codons (alphabet `{A, C, G, U}`) that code for this amino acid. Stop codons are
   * not included here; they are handled separately via the `STOP_CODONS` set in `sequence/`.
   */
  readonly codons: readonly string[];
}
