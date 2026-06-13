/**
 * Tagged-union errors raised by the `processing/` module: the `processRNA` / `processSpliced`
 * pipeline and the variant-aware splice orchestrators. The `kind` discriminators are namespaced
 * under `processing/` and `splice-selection/`. Human-readable messages are produced centrally by
 * `describeError` (see `src/describe.ts`).
 *
 * Two exported error types:
 * - {@link ProcessingError}: the full union the `processRNA` / `processSpliced` pipeline can emit -
 *   the construction-time {@link MRNAError} (re-used from `modifications/`) plus the pipeline-stage
 *   failures (splicing, codon detection, polyadenylation). Every `MRNAError` is therefore also a
 *   `ProcessingError`.
 * - {@link SpliceVariantSelectionError}: the variant-selection failures raised when a gene lacks
 *   the splicing metadata an operation requires.
 */

import type { MRNAError } from '../modifications/index.js';
import type { SplicingError } from '../splicing/index.js';
import type { VariantValidationError } from '../variants/index.js';
import type { PolyadenylationError } from '../polyadenylation/index.js';

/**
 * Pipeline-stage failures raised only by the `processRNA` / `processSpliced` pipeline (never by
 * `parseMRNA`). Module-private; consumers branch on {@link ProcessingError} kinds, not this subset.
 */
type ProcessingPipelineError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'processing/splicing-failed';
      /**
       * Underlying splicing failure. A pure-pre-mRNA splice surfaces a {@link SplicingError}; a
       * variant-driven splice surfaces the per-variant {@link VariantValidationError}.
       */
      readonly cause: SplicingError | VariantValidationError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'processing/no-start-codon';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'processing/no-in-frame-stop';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'processing/polyadenylation-failed';
      /** Underlying poly-A tail failure (e.g. a tail length outside the allowed bounds). */
      readonly cause: PolyadenylationError;
    };

/**
 * Error variants produced by the `processRNA` / `processSpliced` pipeline. Union of
 * {@link MRNAError} (the construction-time validation failures shared with `parseMRNA`) and the
 * pipeline-specific stage failures (splicing, codon detection, polyadenylation).
 */
export type ProcessingError = MRNAError | ProcessingPipelineError;

/**
 * Variant-selection failures: a splice-variant operation required splicing metadata the source
 * gene does not provide.
 *
 * - `splice-selection/no-splicing-profile`: an operation requiring a splicing profile was called
 *   on a gene without one.
 * - `splice-selection/no-default-variant`: a gene's splicing profile defines no resolvable default
 *   variant.
 */
export type SpliceVariantSelectionError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'splice-selection/no-splicing-profile';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'splice-selection/no-default-variant';
    };
