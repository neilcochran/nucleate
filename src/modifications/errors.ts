/**
 * Tagged-union errors raised by the `modifications/` module: the construction-time validation
 * failures produced by `parseMRNA`. The `kind` discriminators are namespaced under `mrna/`.
 *
 * Human-readable messages are produced centrally by `describeError` (see `src/describe.ts`). The
 * full `processRNA` / `processSpliced` pipeline error union ({@link ProcessingError}) lives in
 * `processing/` and includes every {@link MRNAError} variant directly.
 */

import type { RNAError } from '../sequence/index.js';

/**
 * Construction-time validation failures produced by `parseMRNA`.
 *
 * - `mrna/invalid-sequence`: the supplied RNA-sequence string failed parsing.
 * - `mrna/invalid-coding-boundaries`: `codingStart` / `codingEnd` are not finite non-negative
 *   integers, are inverted, or extend past the sequence.
 * - `mrna/incomplete-coding-boundaries`: exactly one of `codingStart` / `codingEnd` was supplied.
 *   A CDS needs both; supply both for a coding mRNA or neither for a non-coding mRNA.
 * - `mrna/invalid-polya-tail-length`: tail length is negative or longer than the sequence.
 */
export type MRNAError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'mrna/invalid-sequence';
      /** Underlying RNA-parser failure. */
      readonly cause: RNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'mrna/invalid-coding-boundaries';
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
      readonly kind: 'mrna/incomplete-coding-boundaries';
      /** `codingStart` as supplied, or `undefined` when it was the omitted boundary. */
      readonly codingStart: number | undefined;
      /** `codingEnd` as supplied, or `undefined` when it was the omitted boundary. */
      readonly codingEnd: number | undefined;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'mrna/invalid-polya-tail-length';
      /** Tail length as supplied. */
      readonly polyATailLength: number;
      /** Length of the underlying RNA sequence. */
      readonly sequenceLength: number;
    };
