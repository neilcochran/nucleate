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
import { describeMRNAError } from '../modifications/index.js';
import type { SplicingError } from '../splicing/index.js';
import { describeSplicingError } from '../splicing/index.js';
import type { VariantValidationError } from '../variants/index.js';
import { describeVariantValidationError } from '../variants/index.js';
import { assertUnreachable } from '../result/index.js';

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
    };

/**
 * Error variants produced by the `processRNA` / `processSpliced` pipeline. Union of
 * {@link MRNAError} (the construction-time validation failures shared with `parseMRNA`) and the
 * pipeline-specific stage failures (splicing, codon detection).
 */
export type ProcessingError = MRNAError | ProcessingPipelineError;

/**
 * Renders a {@link ProcessingError} as a human-readable message. Delegates the {@link MRNAError}
 * subset to {@link describeMRNAError}; handles pipeline-specific kinds inline.
 *
 * @param error - The processing error to render
 * @returns A human-readable description of the failure
 */
export function describeProcessingError(error: ProcessingError): string {
  switch (error.kind) {
    case 'invalid-sequence':
    case 'invalid-coding-boundaries':
    case 'invalid-polya-tail-length':
      return describeMRNAError(error);
    case 'splicing-failed':
      return `Splicing failed: ${describeSplicingFailureCause(error.cause)}`;
    case 'no-start-codon':
      return 'No start codon (AUG) found in spliced sequence';
    case 'no-in-frame-stop':
      return 'No in-frame stop codon found after start codon';
    default:
      return assertUnreachable(error);
  }
}

/**
 * Renders the cause of a `splicing-failed` failure, routing to the splice-operation renderer or
 * the per-variant renderer depending on which union the cause belongs to.
 */
function describeSplicingFailureCause(cause: SplicingError | VariantValidationError): string {
  switch (cause.kind) {
    case 'no-exons':
    case 'exon-out-of-bounds':
    case 'invalid-donor-site':
    case 'invalid-acceptor-site':
    case 'intron-too-short':
      return describeSplicingError(cause);
    default:
      return describeVariantValidationError(cause);
  }
}

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

/**
 * Renders a {@link SpliceVariantSelectionError} as a human-readable message.
 *
 * @param error - The variant-selection error to render
 * @returns A human-readable description of the failure
 */
export function describeSpliceVariantSelectionError(error: SpliceVariantSelectionError): string {
  switch (error.kind) {
    case 'no-splicing-profile':
      return 'Gene does not have an alternative splicing profile';
    case 'no-default-variant':
      return 'Gene does not have a default splice variant defined';
    default:
      return assertUnreachable(error);
  }
}
