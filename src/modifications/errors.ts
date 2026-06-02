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
import { makeDescriber } from '../result/index.js';
import type { DescriberArms } from '../result/index.js';

/**
 * Construction-time validation failures produced by `parseMRNA`.
 *
 * - `invalid-sequence`: the supplied RNA-sequence string failed parsing.
 * - `invalid-coding-boundaries`: `codingStart` / `codingEnd` are not finite non-negative
 *   integers, are inverted, or extend past the sequence.
 * - `incomplete-coding-boundaries`: exactly one of `codingStart` / `codingEnd` was supplied. A
 *   CDS needs both; supply both for a coding mRNA or neither for a non-coding mRNA.
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
      /**
       * Discriminator naming the failure mode. A CDS requires both boundaries; this fires when
       * exactly one of `codingStart` / `codingEnd` was supplied (the other left `undefined`).
       */
      readonly kind: 'incomplete-coding-boundaries';
      /** `codingStart` as supplied, or `undefined` when it was the omitted boundary. */
      readonly codingStart: number | undefined;
      /** `codingEnd` as supplied, or `undefined` when it was the omitted boundary. */
      readonly codingEnd: number | undefined;
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
 * Per-`kind` renderers for {@link MRNAError}. Exported for cross-module spread: `processing/`
 * folds these arms into {@link ProcessingError}'s renderer (every `MRNAError` is also a
 * `ProcessingError`) rather than re-enumerating the construction-time kinds. Intentionally not
 * re-exported from the module barrel - it is internal infrastructure, reached only by deep import
 * (the same boundary the `unsafe*` factories use).
 */
export const MRNA_ERROR_ARMS: DescriberArms<MRNAError> = {
  'invalid-sequence': e => `Invalid mRNA sequence: ${describeRNAError(e.cause)}`,
  'invalid-coding-boundaries': e =>
    `Invalid coding-sequence boundaries: start=${e.codingStart}, end=${e.codingEnd}, sequence length=${e.sequenceLength}`,
  'incomplete-coding-boundaries': e =>
    `Incomplete coding-sequence boundaries (start=${e.codingStart}, end=${e.codingEnd}): a CDS needs both codingStart and codingEnd; supply both for a coding mRNA or neither for a non-coding mRNA`,
  'invalid-polya-tail-length': e =>
    `Invalid poly-A tail length ${e.polyATailLength}: must be between 0 and the sequence length (${e.sequenceLength})`,
};

/** Renders an {@link MRNAError} as a human-readable message. */
export const describeMRNAError = makeDescriber<MRNAError>(MRNA_ERROR_ARMS);
