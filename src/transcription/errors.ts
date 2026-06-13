/**
 * Tagged-union error raised by `transcribe` and the helpers it composes. The `kind`
 * discriminators are namespaced under `transcription/`. Human-readable messages are produced
 * centrally by `describeError` (see `src/describe.ts`).
 */

import type { GeneCoord, GenomicRegion } from '../coordinates/index.js';
import type { RNAError } from '../sequence/index.js';

/**
 * Error variants produced by `transcribe` and `parsePreMRNA`.
 *
 * - `transcription/invalid-rna-sequence`: the supplied RNA-sequence string failed RNA-alphabet
 *   parsing (produced by `parsePreMRNA`).
 * - `transcription/gene-has-no-exons`: the gene supplied no exons, so a TSS / transcript region
 *   cannot be bracketed.
 * - `transcription/no-promoter-found`: no promoter passed the `minPromoterStrength` threshold
 *   within the `maxPromoterSearchDistance` window upstream of the first exon.
 * - `transcription/tss-not-identifiable`: a promoter was located but no TSS coordinate could be
 *   derived from its core elements.
 * - `transcription/tss-out-of-bounds`: a forced TSS lies outside the gene sequence.
 * - `transcription/tss-conflicts-with-exons`: the detected (or forced) TSS lies downstream of one
 *   or more exon starts, so the transformed exon coordinates would be negative.
 */
export type TranscriptionError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'transcription/invalid-rna-sequence';
      /** Underlying RNA-parser failure. */
      readonly cause: RNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'transcription/gene-has-no-exons';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'transcription/no-promoter-found';
      /** Gene-relative window the promoter search covered. */
      readonly searchedRegion: GenomicRegion<GeneCoord>;
      /** Strength threshold the search applied. */
      readonly minStrength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'transcription/tss-not-identifiable';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'transcription/tss-out-of-bounds';
      /** The TSS coordinate the caller (or the algorithm) proposed. */
      readonly tss: number;
      /** Length of the gene sequence the TSS was checked against. */
      readonly sequenceLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'transcription/tss-conflicts-with-exons';
      /** Gene-relative TSS that conflicts with exon coordinates. */
      readonly tss: GeneCoord;
      /** Indices of exons whose starts lie upstream of the TSS. */
      readonly conflictingExons: readonly number[];
    };
