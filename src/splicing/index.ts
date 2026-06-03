/**
 * Splicing-level domain types: the `spliceRNA` driver, the splice-site validators
 * (`validateTranscriptSpliceSites`, `validateSpliceSites`, `findPotentialSpliceSites`), the
 * canonical {@link SPLICE_CONSENSUS} dinucleotides, and the {@link SplicingError} tagged union.
 *
 * This module is a pure leaf: it owns the splice operation and splice-site recognition only.
 * The variant-aware orchestrators that drive splicing through the full processing pipeline
 * live in `processing/`.
 */
export { spliceRNA, validateTranscriptSpliceSites } from './splicing.js';
export type { SpliceRNAOptions } from './splicing.js';
export { validateSpliceSites, findPotentialSpliceSites } from './splice-sites.js';
export { SPLICE_CONSENSUS } from './splice-consensus.js';
export { MIN_INTRON_LENGTH_FOR_SPLICING } from './biology.js';
export { DEFAULT_MAX_INTRON_SEARCH } from './tuning.js';
export type { SplicingError } from './errors.js';
