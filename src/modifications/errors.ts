/**
 * Tagged-union errors raised by the `modifications/` module: the construction-time validation
 * failures produced by `parseMRNA`.
 *
 * Human-readable messages are produced by the renderer function below rather than carried
 * alongside the structured payload. The full `processRNA` / `processSpliced` pipeline error
 * union ({@link ProcessingError}) lives in `processing/`, which re-uses {@link MRNAError} as its
 * construction-time subset.
 */

import type { RNAError } from '../sequence/index.js';
import { describeRNAError } from '../sequence/index.js';
import { assertUnreachable } from '../result/index.js';

/**
 * Construction-time validation failures produced by `parseMRNA`.
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
