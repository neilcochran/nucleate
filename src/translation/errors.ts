/**
 * Tagged-union errors produced by `parseAminoAcid` and the `translate` pipeline. The `kind`
 * discriminators are namespaced under `translation/`. Human-readable messages are produced
 * centrally by `describeError` (see `src/describe.ts`).
 *
 * - `translation/invalid-codon-sequence`: the supplied codon string failed RNA-alphabet parsing.
 * - `translation/invalid-codon-length`: the supplied codon string was not exactly 3 nucleotides.
 * - `translation/stop-codon`: the supplied codon was a stop codon (which does not code for an
 *   amino acid).
 * - `translation/invalid-codon`: a 3-character RNA codon that nonetheless was not present in the
 *   codon table (programmer-error path; should not be reachable with a validated RNA codon).
 * - `translation/invalid-reading-frame`: the mRNA coding sequence length is not a positive
 *   multiple of the codon length.
 * - `translation/no-coding-sequence`: the mRNA carries no coding sequence, so there is nothing to
 *   translate.
 */

import type { RNAError } from '../sequence/index.js';

/**
 * Error variants produced by `parseAminoAcid` and `translate`.
 */
export type TranslationError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'translation/invalid-codon-sequence';
      /** The codon string the caller supplied. */
      readonly codon: string;
      /** Underlying RNA-parser failure. */
      readonly cause: RNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'translation/invalid-codon-length';
      /** The codon string the caller supplied. */
      readonly codon: string;
      /** The codon length the caller supplied. */
      readonly length: number;
      /** The expected length (always 3 for the standard genetic code). */
      readonly expected: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'translation/stop-codon';
      /** The stop codon the caller supplied. */
      readonly codon: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'translation/invalid-codon';
      /** The codon string the caller supplied. */
      readonly codon: string;
      /**
       * 0-based offset of the codon within the coding sequence, when reached during translation.
       * `0` when the failure originates from `parseAminoAcid` on a single codon.
       */
      readonly position: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'translation/invalid-reading-frame';
      /** The coding sequence length the caller supplied. */
      readonly codingLength: number;
      /** The expected codon length (always 3 for the standard genetic code). */
      readonly codonLength: number;
    }
  | {
      /**
       * Discriminator naming the failure mode. The mRNA has no coding sequence to translate (its
       * `codingSequence` is `undefined` - no CDS was identified during processing).
       */
      readonly kind: 'translation/no-coding-sequence';
    };
