/**
 * Tagged-union errors raised by the `processing/` module: the `processRNA` / `processSpliced`
 * pipeline and the variant-aware splice orchestrators.
 *
 * Two exported error types:
 * - {@link ProcessingError}: the full union the `processRNA` / `processSpliced` pipeline can
 *   emit, which is the construction-time {@link MRNAError} (re-used from `modifications/`) plus
 *   the pipeline-stage failures (splicing, codon detection). Every `MRNAError` is therefore
 *   also a `ProcessingError`.
 * - {@link SpliceVariantSelectionError}: the variant-selection failures raised when a gene
 *   lacks the splicing metadata an operation requires.
 *
 * Human-readable messages are produced by the renderer functions below rather than carried
 * alongside the structured payload.
 */

import type { MRNAError } from '../modifications/index.js';
import { MRNA_ERROR_ARMS } from '../modifications/errors.js';
import type { SplicingError } from '../splicing/index.js';
import { SPLICING_ERROR_ARMS } from '../splicing/errors.js';
import type { VariantValidationError } from '../variants/index.js';
import { VARIANT_VALIDATION_ERROR_ARMS } from '../variants/errors.js';
import type { PolyadenylationError } from '../polyadenylation/index.js';
import { describePolyadenylationError } from '../polyadenylation/index.js';
import { makeDescriber } from '../result/index.js';

/**
 * Pipeline-stage failures raised only by the `processRNA` / `processSpliced` pipeline (never by
 * `parseMRNA`). Module-private; consumers branch on {@link ProcessingError} kinds, not this
 * subset.
 */
type ProcessingPipelineError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'splicing-failed';
      /**
       * Underlying splicing failure. A pure-pre-mRNA splice surfaces a {@link SplicingError};
       * a variant-driven splice surfaces the per-variant {@link VariantValidationError}.
       */
      readonly cause: SplicingError | VariantValidationError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'no-start-codon';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'no-in-frame-stop';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'polyadenylation-failed';
      /** Underlying poly-A tail failure (e.g. a tail length outside the allowed bounds). */
      readonly cause: PolyadenylationError;
    };

/**
 * Error variants produced by the `processRNA` / `processSpliced` pipeline. Union of
 * {@link MRNAError} (the construction-time validation failures shared with `parseMRNA`) and the
 * pipeline-specific stage failures (splicing, codon detection).
 */
export type ProcessingError = MRNAError | ProcessingPipelineError;

/**
 * Renders the cause of a `splicing-failed` failure. The cause is the union of the pure-splice
 * {@link SplicingError} and the per-variant {@link VariantValidationError}; spreading both arms
 * records renders either side without re-enumerating its variants, so a new variant in either
 * union never forces an edit here.
 */
const describeSplicingFailureCause = makeDescriber<SplicingError | VariantValidationError>({
  ...SPLICING_ERROR_ARMS,
  ...VARIANT_VALIDATION_ERROR_ARMS,
});

/**
 * Renders a {@link ProcessingError} as a human-readable message. Spreads {@link MRNA_ERROR_ARMS}
 * (every `MRNAError` is also a `ProcessingError`) and handles the pipeline-specific kinds inline,
 * so the shared construction-time kinds render identically to {@link describeMRNAError}.
 */
export const describeProcessingError = makeDescriber<ProcessingError>({
  ...MRNA_ERROR_ARMS,
  'splicing-failed': e => `Splicing failed: ${describeSplicingFailureCause(e.cause)}`,
  'no-start-codon': () => 'No start codon (AUG) found in spliced sequence',
  'no-in-frame-stop': () => 'No in-frame stop codon found after start codon',
  'polyadenylation-failed': e => `Polyadenylation failed: ${describePolyadenylationError(e.cause)}`,
});

/**
 * Variant-selection failures: a splice-variant operation required splicing metadata the source
 * gene does not provide.
 *
 * - `no-splicing-profile`: an operation requiring a splicing profile was called on a gene
 *   without one.
 * - `no-default-variant`: a gene's splicing profile defines no resolvable default variant.
 */
export type SpliceVariantSelectionError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'no-splicing-profile';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'no-default-variant';
    };

/** Renders a {@link SpliceVariantSelectionError} as a human-readable message. */
export const describeSpliceVariantSelectionError = makeDescriber<SpliceVariantSelectionError>({
  'no-splicing-profile': () => 'Gene does not have an alternative splicing profile',
  'no-default-variant': () => 'Gene does not have a default splice variant defined',
});
