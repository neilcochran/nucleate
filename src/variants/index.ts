/**
 * Foundational splice-variant data types and helpers: the {@link SpliceVariant} +
 * {@link AlternativeSplicingProfile} metadata interfaces, the {@link AlternativeSplicingOptions}
 * validation-options shape with {@link DEFAULT_ALTERNATIVE_SPLICING_OPTIONS}, the four
 * free-function variant builders ({@link exonSkippingVariant}, {@link truncationVariant},
 * {@link minimalVariant}, {@link fullLengthVariant}), and the {@link VariantValidationError}
 * tagged union.
 *
 * This module is a dependency-free leaf: it owns the variant *vocabulary* (data shapes, builders,
 * error type) but not the gene-aware validator. Validating a variant requires a concrete `Gene`,
 * so `validateSpliceVariant` lives in `gene/`; keeping it out of here means `variants/` never
 * imports `gene/`, so there is no dependency cycle to break.
 */
export type { SpliceVariant, AlternativeSplicingOptions } from './splice-variant.js';
export { DEFAULT_ALTERNATIVE_SPLICING_OPTIONS } from './splice-variant.js';
export type { AlternativeSplicingProfile } from './alternative-splicing-profile.js';
export {
  exonSkippingVariant,
  truncationVariant,
  minimalVariant,
  fullLengthVariant,
} from './builders.js';
export type { VariantValidationError } from './errors.js';
export { describeVariantValidationError } from './errors.js';
