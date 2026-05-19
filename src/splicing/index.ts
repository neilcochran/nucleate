/**
 * Splicing-level domain types: the `spliceRNA` driver, the alternative-splicing helpers
 * (`spliceRNAWithVariant`, `processSpliceVariant`, `processAllSplicingVariants`,
 * `processDefaultSpliceVariant`, `enumerateSpliceVariants`), splice-site validators, the
 * {@link SplicingOutcome} container, the canonical {@link SPLICE_CONSENSUS} dinucleotides,
 * and the {@link SplicingError} tagged union.
 */
export { spliceRNA, validateTranscriptSpliceSites } from './splicing.js';
export type { SpliceRNAOptions } from './splicing.js';
export {
  spliceRNAWithVariant,
  processSpliceVariant,
  processAllSplicingVariants,
  processDefaultSpliceVariant,
  enumerateSpliceVariants,
} from './alternative-splicing.js';
export type { SpliceVariantProcessingOptions } from './alternative-splicing.js';
export { SplicingOutcome } from './splicing-outcome.js';
export { validateSpliceSites, findPotentialSpliceSites } from './splice-sites.js';
export { SPLICE_CONSENSUS } from './splice-consensus.js';
export { MIN_INTRON_LENGTH_FOR_SPLICING } from './biology.js';
export type { SplicingError } from './errors.js';
export { describeSplicingError } from './errors.js';
