import type { RNAError } from '../sequence/index.js';
import { describeRNAError } from '../sequence/index.js';
import { makeDescriber } from '../result/index.js';

/**
 * Tagged-union errors raised by {@link parseRNAPrimer}.
 *
 * - `invalid-position`: the supplied position was not a non-negative integer.
 * - `invalid-sequence`: the supplied sequence failed RNA-alphabet parsing.
 * - `invalid-length`: the supplied sequence length is outside the biological 3-10 nt range.
 */
export type RNAPrimerError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-position';
      /** The position the caller supplied. */
      readonly position: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-sequence';
      /** Underlying RNA-parser failure. */
      readonly cause: RNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-length';
      /** The length the caller supplied. */
      readonly length: number;
      /** The minimum biologically-acceptable length (always 3). */
      readonly min: number;
      /** The maximum biologically-acceptable length (always 10). */
      readonly max: number;
    };

/**
 * Tagged-union errors raised by {@link parseOkazakiFragment}.
 *
 * - `empty-id`: the supplied identifier was an empty string.
 * - `invalid-position`: the start position was not a non-negative integer.
 * - `invalid-range`: `endPosition` was not strictly greater than `startPosition`.
 * - `primer-position-mismatch`: the primer's position did not equal the fragment's
 *   `startPosition`.
 * - `sequence-length-mismatch`: an optional `sequence` was supplied whose length did not
 *   equal `endPosition - startPosition`.
 */
export type OkazakiFragmentError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'empty-id';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-position';
      /** The position the caller supplied. */
      readonly position: number;
      /** Which field the position came from (always `'startPosition'` today). */
      readonly field: 'startPosition';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-range';
      /** The start position the caller supplied. */
      readonly startPosition: number;
      /** The end position the caller supplied. */
      readonly endPosition: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'primer-position-mismatch';
      /** The primer's `position` field. */
      readonly primerPosition: number;
      /** The fragment's `startPosition`. */
      readonly startPosition: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'sequence-length-mismatch';
      /** Length of the supplied DNA sequence. */
      readonly sequenceLength: number;
      /** Length the sequence was required to have. */
      readonly expectedLength: number;
    };

/**
 * Tagged-union errors raised by {@link replicate} and {@link replicateSteps}.
 *
 * - `template-too-short`: the supplied template's length is shorter than the chosen
 *   organism's maximum primer length, meaning even a single RNA primer could not be placed
 *   on the lagging-strand template. Real replication forks cannot assemble on sequences
 *   this short.
 */
export type ReplicationError = {
  /** Discriminator naming the failure mode. */
  readonly kind: 'template-too-short';
  /** Length of the supplied template in base pairs. */
  readonly length: number;
  /** Minimum length required for replication to proceed (maximum primer length). */
  readonly minimum: number;
};

/** Renders an {@link RNAPrimerError} as a human-readable message. */
export const describeRNAPrimerError = makeDescriber<RNAPrimerError>({
  'invalid-position': e =>
    `RNA primer position must be a non-negative integer; received ${e.position}`,
  'invalid-sequence': e => `Invalid RNA primer sequence: ${describeRNAError(e.cause)}`,
  'invalid-length': e =>
    `RNA primers must be ${e.min}-${e.max} nucleotides; received length ${e.length}`,
});

/** Renders an {@link OkazakiFragmentError} as a human-readable message. */
export const describeOkazakiFragmentError = makeDescriber<OkazakiFragmentError>({
  'empty-id': () => 'Okazaki fragment id cannot be empty',
  'invalid-position': e =>
    `Okazaki fragment ${e.field} must be a non-negative integer; received ${e.position}`,
  'invalid-range': e =>
    `Okazaki fragment endPosition (${e.endPosition}) must be strictly greater than startPosition (${e.startPosition})`,
  'primer-position-mismatch': e =>
    `RNA primer position (${e.primerPosition}) must equal fragment startPosition (${e.startPosition})`,
  'sequence-length-mismatch': e =>
    `Okazaki fragment sequence length (${e.sequenceLength}) must equal range length (${e.expectedLength})`,
});

/** Renders a {@link ReplicationError} as a human-readable message. */
export const describeReplicationError = makeDescriber<ReplicationError>({
  'template-too-short': e =>
    `Template length ${e.length} bp is below the minimum ${e.minimum} bp required for replication on the chosen organism`,
});
