/**
 * Translation-level domain types: the `translate` pipeline, the `AminoAcid` and
 * `Polypeptide` composition-based domain types, the canonical {@link AMINO_ACIDS} list with
 * its derived codon-lookup maps, amino-acid biochemical classification enums, and the
 * {@link TranslationError} tagged union.
 *
 * The `AminoAcid` / `Polypeptide` classes are exported as types only, so construction is
 * reachable only through `parseAminoAcid` / `translate`. The module-private `unsafeAminoAcid` /
 * `unsafeAminoAcidFromString` factories are likewise excluded from this barrel.
 */
export type { AminoAcid } from './AminoAcid.js';
export type { Polypeptide } from './Polypeptide.js';
export { parseAminoAcid } from './parse.js';
export { translate } from './translate.js';
export {
  AMINO_ACIDS,
  AMINO_ACID_BY_CODON,
  AMINO_ACID_BY_SINGLE_LETTER,
  getAminoAcidDataByCodon,
  getAminoAcidDataBySingleLetter,
} from './amino-acids.js';
export type { AminoAcidData } from './AminoAcidData.js';
export { AminoAcidCharge, AminoAcidPolarity, AminoAcidSideChainType } from './enums.js';
export type { TranslationError } from './errors.js';
export { describeTranslationError } from './errors.js';
