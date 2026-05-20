/**
 * Tagged-union errors raised by the `modifications/` module: `parseMRNA` and the `processRNA`
 * pipeline.
 *
 * Two exported error types:
 * - {@link MRNAError}: the strict subset that `parseMRNA` can emit (construction-time
 *   validation of the supplied sequence + coding boundaries + poly-A tail length).
 * - {@link ProcessingError}: the full union that the `processRNA` pipeline can emit, which
 *   is `MRNAError` plus the pipeline-stage failures (splicing, codon detection). Every
 *   `MRNAError` is therefore also a `ProcessingError`.
 *
 * Human-readable messages are produced by the renderer functions below rather than carried
 * alongside the structured payload.
 */

import type { RNAError } from '../sequence/index.js';
import { describeRNAError } from '../sequence/index.js';
import { assertUnreachable } from '../result/index.js';
import type { SplicingError } from '../splicing/index.js';
import { describeSplicingError } from '../splicing/index.js';

/**
 * Construction-time validation failures produced by `parseMRNA`. Strict subset of
 * {@link ProcessingError}.
 *
 * - `invalid-sequence`: the supplied RNA-sequence string failed parsing.
 * - `invalid-coding-boundaries`: `codingStart` / `codingEnd` are not finite non-negative
 *   integers, are inverted, or extend past the sequence.
 * - `invalid-polya-tail-length`: tail length is negative or longer than the sequence.
 */
export type MRNAError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-sequence';
      /** Underlying RNA-parser failure. */
      readonly cause: RNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-coding-boundaries';
      /** `codingStart` value as supplied. */
      readonly codingStart: number;
      /** `codingEnd` value as supplied. */
      readonly codingEnd: number;
      /** Length of the underlying RNA sequence. */
      readonly sequenceLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-polya-tail-length';
      /** Tail length as supplied. */
      readonly polyATailLength: number;
      /** Length of the underlying RNA sequence. */
      readonly sequenceLength: number;
    };

/**
 * Pipeline-stage failures raised only by the `processRNA` pipeline (never by `parseMRNA`).
 * Module-private; consumers branch on {@link ProcessingError} kinds, not this subset.
 */
type ProcessingPipelineError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'splicing-failed';
      /** Underlying splicing failure. */
      readonly cause: SplicingError;
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
 * Error variants produced by the `processRNA` pipeline. Union of {@link MRNAError} (the
 * construction-time validation failures shared with `parseMRNA`) and the pipeline-specific
 * stage failures (splicing, codon detection).
 */
export type ProcessingError = MRNAError | ProcessingPipelineError;

/** Renders an {@link MRNAError} as a human-readable message. */
export function describeMRNAError(error: MRNAError): string {
  switch (error.kind) {
    case 'invalid-sequence':
      return `Invalid mRNA sequence: ${describeRNAError(error.cause)}`;
    case 'invalid-coding-boundaries':
      return `Invalid coding-sequence boundaries: start=${error.codingStart}, end=${error.codingEnd}, sequence length=${error.sequenceLength}`;
    case 'invalid-polya-tail-length':
      return `Invalid poly-A tail length ${error.polyATailLength}: must be between 0 and the sequence length (${error.sequenceLength})`;
    default:
      return assertUnreachable(error);
  }
}

/**
 * Renders a {@link ProcessingError} as a human-readable message. Delegates the
 * {@link MRNAError} subset to {@link describeMRNAError}; handles pipeline-specific kinds inline.
 */
export function describeProcessingError(error: ProcessingError): string {
  switch (error.kind) {
    case 'invalid-sequence':
    case 'invalid-coding-boundaries':
    case 'invalid-polya-tail-length':
      return describeMRNAError(error);
    case 'splicing-failed':
      return `Splicing failed: ${describeSplicingError(error.cause)}`;
    case 'no-start-codon':
      return 'No start codon (AUG) found in spliced sequence';
    case 'no-in-frame-stop':
      return 'No in-frame stop codon found after start codon';
    default:
      return assertUnreachable(error);
  }
}
