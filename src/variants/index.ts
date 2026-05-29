/**
 * Foundational splice-variant types and helpers: the {@link SpliceVariant} +
 * {@link AlternativeSplicingProfile} metadata interfaces, the validation rules
 * ({@link validateSpliceVariant} + {@link AlternativeSplicingOptions} +
 * {@link DEFAULT_ALTERNATIVE_SPLICING_OPTIONS}), the four free-function variant builders
 * ({@link exonSkippingVariant}, {@link truncationVariant}, {@link minimalVariant},
 * {@link fullLengthVariant}), and the {@link VariantValidationError} tagged union.
 *
 * The `gene/` module imports the type interfaces (type-only) so that `Gene` can carry a
 * splicing profile; the processing modules import the values for runtime variant work.
 * {@link validateSpliceVariant} accepts the structural {@link VariantSourceGene} slice rather
 * than the `Gene` class, so this module does not import `gene/` (avoiding a dependency cycle).
 */
export type { SpliceVariant, AlternativeSplicingOptions } from './splice-variant.js';
export { DEFAULT_ALTERNATIVE_SPLICING_OPTIONS } from './splice-variant.js';
export type { AlternativeSplicingProfile } from './alternative-splicing-profile.js';
export { validateSpliceVariant } from './validate-splice-variant.js';
export type { VariantSourceGene } from './validate-splice-variant.js';
export {
  exonSkippingVariant,
  truncationVariant,
  minimalVariant,
  fullLengthVariant,
} from './builders.js';
export type { VariantValidationError } from './errors.js';
export { describeVariantValidationError } from './errors.js';
