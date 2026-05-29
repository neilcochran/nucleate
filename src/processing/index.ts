/**
 * RNA-processing orchestration: the `processRNA` / `processSpliced` pipeline that turns a
 * pre-mRNA (or an already-spliced RNA) into a mature {@link MRNA}, and the variant-aware
 * orchestrators (`spliceRNAWithVariant`, `processSpliceVariant`, `processAllSplicingVariants`,
 * `processDefaultSpliceVariant`, `enumerateSpliceVariants`) that drive alternative splicing
 * through the same pipeline. Also exports the {@link SplicingOutcome} container and the
 * processing-stage error unions ({@link ProcessingError}, {@link SpliceVariantSelectionError}).
 *
 * This module sits above the leaf domain modules (`splicing/`, `polyadenylation/`,
 * `modifications/`, `translation/`, `variants/`) and orchestrates them; nothing depends back
 * up on it.
 */
export { processRNA, processSpliced, DEFAULT_RNA_PROCESSING_OPTIONS } from './process-rna.js';
export type { RNAProcessingOptions } from './process-rna.js';
export {
  spliceRNAWithVariant,
  processSpliceVariant,
  processAllSplicingVariants,
  processDefaultSpliceVariant,
  enumerateSpliceVariants,
} from './alternative-splicing.js';
export type { SpliceVariantProcessingOptions } from './alternative-splicing.js';
export { SplicingOutcome } from './splicing-outcome.js';
export type { ProcessingError, SpliceVariantSelectionError } from './errors.js';
export { describeProcessingError, describeSpliceVariantSelectionError } from './errors.js';
