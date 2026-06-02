/**
 * Closed-set classifications for amino-acid biochemistry, modeled as `as const` objects plus a
 * derived value-union type - the same idiom used for closed sets elsewhere in the codebase
 * (e.g. `NUCLEOTIDE_PATTERN_SYMBOLS`, `STOP_CODONS`) rather than a TypeScript `enum`. Each
 * constant doubles as the value namespace (`AminoAcidCharge.POSITIVE`) and the type
 * (`charge: AminoAcidCharge`).
 */

/**
 * Net charge of an amino acid at physiological pH (7.0).
 */
export const AminoAcidCharge = {
  /** Net positive side-chain charge (Arg, Lys, His). */
  POSITIVE: 'positive',
  /** Net negative side-chain charge (Asp, Glu). */
  NEGATIVE: 'negative',
  /** No net charge on the side chain. */
  NEUTRAL: 'neutral',
} as const;

/** Net side-chain charge of an amino acid (one of the {@link AminoAcidCharge} values). */
export type AminoAcidCharge = (typeof AminoAcidCharge)[keyof typeof AminoAcidCharge];

/**
 * Side-chain polarity classification for an amino acid.
 */
export const AminoAcidPolarity = {
  /** Polar side chain (e.g. Ser, Thr, Asn, Gln, Tyr, Cys). */
  POLAR: 'polar',
  /** Nonpolar (hydrophobic) side chain (e.g. Ala, Val, Leu, Ile, Met, Phe, Trp). */
  NONPOLAR: 'nonpolar',
} as const;

/** Side-chain polarity of an amino acid (one of the {@link AminoAcidPolarity} values). */
export type AminoAcidPolarity = (typeof AminoAcidPolarity)[keyof typeof AminoAcidPolarity];

/**
 * Chemical classification of an amino-acid side chain.
 */
export const AminoAcidSideChainType = {
  /** Aliphatic side chain (Ala, Val, Leu, Ile, Gly). */
  ALIPHATIC: 'aliphatic',
  /** Aromatic side chain (Phe, Tyr, Trp). */
  AROMATIC: 'aromatic',
  /** Basic side chain (Lys, Arg, His). */
  BASIC: 'basic',
  /** Acidic side chain (Asp, Glu). */
  ACIDIC: 'acidic',
  /** Amide side chain (Asn, Gln). */
  AMIDE: 'amide',
  /** Sulfur-containing side chain (Cys, Met). */
  SULFUR_CONTAINING: 'sulfur-containing',
  /** Hydroxyl-containing side chain (Ser, Thr). */
  HYDROXYL_CONTAINING: 'hydroxyl-containing',
  /** Imino side chain (Pro). */
  IMINO: 'imino',
} as const;

/** Side-chain chemical class of an amino acid (one of the {@link AminoAcidSideChainType} values). */
export type AminoAcidSideChainType =
  (typeof AminoAcidSideChainType)[keyof typeof AminoAcidSideChainType];
