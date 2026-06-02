/**
 * Gene-level domain types: `Gene`, `Promoter`, `PromoterElement`, their structured-error
 * tagged unions, the `parseGene` / `parsePromoter` / `parsePromoterElement` parsers,
 * `validateExons`, and the canonical promoter-element consensus instances.
 *
 * The `Gene` / `Promoter` / `PromoterElement` classes are exported as types only, so
 * construction is reachable only through the parsers below. The module-private `unsafeGene` /
 * `unsafePromoter` / `unsafePromoterElement` factories are likewise excluded from this barrel.
 */
export type { Gene } from './Gene.js';
export type { Promoter } from './Promoter.js';
export { PROMOTER_SYNERGY_MULTIPLIER } from './Promoter.js';
export type { PromoterElement } from './PromoterElement.js';
export { parseGene, parsePromoter, parsePromoterElement } from './parse.js';
export { validateExons } from './validate-exons.js';
export { validateSpliceVariant } from './validate-splice-variant.js';
export type { GeneError, PromoterError, PromoterElementError } from './errors.js';
export {
  describeGeneError,
  describePromoterError,
  describePromoterElementError,
} from './errors.js';
export {
  TATA_BOX,
  INITIATOR,
  DOWNSTREAM_PROMOTER_ELEMENT,
  CAAT_BOX,
  GC_BOX,
  CEBP_SITE,
  E_BOX,
  AP1_SITE,
  STANDARD_PROMOTER_ELEMENTS,
  CORE_PROMOTER_ELEMENTS,
  PROXIMAL_PROMOTER_ELEMENTS,
  PROMOTER_ELEMENT_COMBINATIONS,
} from './consensus.js';
export {
  MIN_EXON_SIZE,
  MAX_EXON_SIZE,
  MIN_INTRON_SIZE,
  MAX_INTRON_SIZE,
  TATA_BOX_TYPICAL_POSITION,
  DPE_TYPICAL_POSITION,
} from './biology.js';
export { DEFAULT_MAX_INTRON_SEARCH } from './tuning.js';
