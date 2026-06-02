import type { RNAError } from '../sequence/index.js';
import { describeRNAError } from '../sequence/index.js';
import { makeDescriber } from '../result/index.js';

/**
 * Tagged-union errors produced by `parseAminoAcid` and the `translate` pipeline.
 *
 * - `invalid-codon-sequence`: the supplied codon string failed RNA-alphabet parsing.
 * - `invalid-codon-length`: the supplied codon string was not exactly 3 nucleotides.
 * - `stop-codon`: the supplied codon was a stop codon (which does not code for an amino
 *   acid).
 * - `invalid-codon`: a 3-character RNA codon that nonetheless was not present in the codon
 *   table (programmer-error path; should not be reachable with a validated RNA codon).
 * - `invalid-reading-frame`: the mRNA coding sequence length is not a positive multiple of
 *   the codon length.
 * - `no-coding-sequence`: the mRNA carries no coding sequence (no CDS was identified, e.g. a
 *   start-codon knockout processed with `validateCodons: false`), so there is nothing to
 *   translate.
 */
export type TranslationError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-codon-sequence';
      /** The codon string the caller supplied. */
      readonly codon: string;
      /** Underlying RNA-parser failure. */
      readonly cause: RNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-codon-length';
      /** The codon string the caller supplied. */
      readonly codon: string;
      /** The codon length the caller supplied. */
      readonly length: number;
      /** The expected length (always 3 for the standard genetic code). */
      readonly expected: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'stop-codon';
      /** The stop codon the caller supplied. */
      readonly codon: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-codon';
      /** The codon string the caller supplied. */
      readonly codon: string;
      /**
       * 0-based offset of the codon within the coding sequence, when reached during
       * translation. `0` when the failure originates from {@link parseAminoAcid} on a
       * single codon.
       */
      readonly position: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-reading-frame';
      /** The coding sequence length the caller supplied. */
      readonly codingLength: number;
      /** The expected codon length (always 3 for the standard genetic code). */
      readonly codonLength: number;
    }
  | {
      /**
       * Discriminator naming the failure mode. The mRNA has no coding sequence to translate
       * (its `codingSequence` is `undefined` - no CDS was identified during processing).
       */
      readonly kind: 'no-coding-sequence';
    };

/** Renders a {@link TranslationError} as a human-readable message. */
export const describeTranslationError = makeDescriber<TranslationError>({
  'invalid-codon-sequence': e => `Invalid codon '${e.codon}': ${describeRNAError(e.cause)}`,
  'invalid-codon-length': e =>
    `Invalid codon '${e.codon}': length ${e.length} (expected ${e.expected})`,
  'stop-codon': e => `Codon '${e.codon}' is a stop codon and does not code for an amino acid`,
  'invalid-codon': e =>
    `Codon '${e.codon}' at position ${e.position} does not code for any amino acid`,
  'invalid-reading-frame': e =>
    `Coding sequence length ${e.codingLength} is not a multiple of codon length ${e.codonLength}`,
  'no-coding-sequence': () => 'mRNA has no coding sequence to translate',
});
