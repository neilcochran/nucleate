/**
 * Tagged-union errors raised by the `replication/` module. The `kind` discriminators are
 * namespaced under `primer/`, `okazaki/`, and `replication/`. Human-readable messages are
 * produced centrally by `describeError` (see `src/describe.ts`).
 */

import type { RNAError } from '../sequence/index.js';

/**
 * Tagged-union errors raised by `parseRNAPrimer`.
 *
 * - `primer/invalid-position`: the supplied position was not a non-negative integer.
 * - `primer/invalid-sequence`: the supplied sequence failed RNA-alphabet parsing.
 * - `primer/invalid-length`: the supplied sequence length is outside the biological 3-10 nt range.
 */
export type RNAPrimerError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'primer/invalid-position';
      /** The position the caller supplied. */
      readonly position: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'primer/invalid-sequence';
      /** Underlying RNA-parser failure. */
      readonly cause: RNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'primer/invalid-length';
      /** The length the caller supplied. */
      readonly length: number;
      /** The minimum biologically-acceptable length (always 3). */
      readonly min: number;
      /** The maximum biologically-acceptable length (always 10). */
      readonly max: number;
    };

/**
 * Tagged-union errors raised by the Okazaki-fragment parsers (`parsePrimerOnlyFragment`,
 * `parseSynthesizedFragment`, `parsePrimerRemovedFragment`, and `parseLigatedFragment`).
 *
 * - `okazaki/empty-id`: the supplied identifier was an empty string.
 * - `okazaki/invalid-position`: the start position was not a non-negative integer.
 * - `okazaki/invalid-range`: `endPosition` was not strictly greater than `startPosition`.
 * - `okazaki/primer-position-mismatch`: the primer's position did not equal the fragment's
 *   `startPosition`.
 * - `okazaki/sequence-length-mismatch`: an optional `sequence` was supplied whose length did not
 *   equal `endPosition - startPosition`.
 */
export type OkazakiFragmentError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'okazaki/empty-id';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'okazaki/invalid-position';
      /** The position the caller supplied. */
      readonly position: number;
      /** Which field the position came from (always `'startPosition'` today). */
      readonly field: 'startPosition';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'okazaki/invalid-range';
      /** The start position the caller supplied. */
      readonly startPosition: number;
      /** The end position the caller supplied. */
      readonly endPosition: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'okazaki/primer-position-mismatch';
      /** The primer's `position` field. */
      readonly primerPosition: number;
      /** The fragment's `startPosition`. */
      readonly startPosition: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'okazaki/sequence-length-mismatch';
      /** Length of the supplied DNA sequence. */
      readonly sequenceLength: number;
      /** Length the sequence was required to have. */
      readonly expectedLength: number;
    };

/**
 * Tagged-union errors raised by `replicate` and `replicateSteps`.
 *
 * - `replication/template-too-short`: the supplied template's length is shorter than the chosen
 *   organism's maximum primer length, meaning even a single RNA primer could not be placed on the
 *   lagging-strand template.
 */
export type ReplicationError = {
  /** Discriminator naming the failure mode. */
  readonly kind: 'replication/template-too-short';
  /** Length of the supplied template in base pairs. */
  readonly length: number;
  /** Minimum length required for replication to proceed (maximum primer length). */
  readonly minimum: number;
};
