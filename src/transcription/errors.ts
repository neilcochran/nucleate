/**
 * Tagged-union error raised by `transcribe` and the helpers it composes.
 *
 * Callers branch on `kind` and TypeScript narrows the surrounding fields. Human-readable
 * messages are produced by {@link describeTranscriptionError} rather than carried alongside the
 * structured payload.
 */

import type { GeneCoord, GenomicRegion } from '../coordinates/index.js';
import type { RNAError } from '../sequence/index.js';
import { describeRNAError } from '../sequence/index.js';
import { assertUnreachable } from '../result/index.js';

/**
 * Error variants produced by `transcribe` and `parsePreMRNA`.
 *
 * - `invalid-rna-sequence`: the supplied RNA-sequence string failed RNA-alphabet parsing
 *   (produced by `parsePreMRNA`).
 * - `gene-has-no-exons`: the gene supplied no exons, so a TSS / transcript region cannot be
 *   bracketed.
 * - `no-promoter-found`: no promoter passed the `minPromoterStrength` threshold within the
 *   `maxPromoterSearchDistance` window upstream of the first exon.
 * - `tss-not-identifiable`: a promoter was located but no TSS coordinate could be derived
 *   from its core elements (e.g. the promoter has only proximal elements and the predicted
 *   TSS falls outside the search-region bounds).
 * - `tss-out-of-bounds`: a forced TSS lies outside the gene sequence.
 * - `tss-conflicts-with-exons`: the detected (or forced) TSS lies downstream of one or more
 *   exon starts, so the transformed exon coordinates would be negative.
 */
export type TranscriptionError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-rna-sequence';
      /** Underlying RNA-parser failure. */
      readonly cause: RNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene-has-no-exons';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'no-promoter-found';
      /** Gene-relative window the promoter search covered. */
      readonly searchedRegion: GenomicRegion<GeneCoord>;
      /** Strength threshold the search applied. */
      readonly minStrength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'tss-not-identifiable';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'tss-out-of-bounds';
      /** The TSS coordinate the caller (or the algorithm) proposed. */
      readonly tss: number;
      /** Length of the gene sequence the TSS was checked against. */
      readonly sequenceLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'tss-conflicts-with-exons';
      /** Gene-relative TSS that conflicts with exon coordinates. */
      readonly tss: GeneCoord;
      /** Indices of exons whose starts lie upstream of the TSS. */
      readonly conflictingExons: readonly number[];
    };

/** Renders a {@link TranscriptionError} as a human-readable message. */
export function describeTranscriptionError(error: TranscriptionError): string {
  switch (error.kind) {
    case 'invalid-rna-sequence':
      return `Invalid pre-mRNA sequence: ${describeRNAError(error.cause)}`;
    case 'gene-has-no-exons':
      return 'Gene has no exons; cannot determine transcript bounds';
    case 'no-promoter-found':
      return `No promoter passing minStrength=${error.minStrength} found in gene region [${error.searchedRegion.start}, ${error.searchedRegion.end})`;
    case 'tss-not-identifiable':
      return 'Promoter located but no transcription start site could be derived from its elements';
    case 'tss-out-of-bounds':
      return `Transcription start site ${error.tss} is outside gene bounds (sequence length ${error.sequenceLength})`;
    case 'tss-conflicts-with-exons':
      return `TSS at position ${error.tss} conflicts with gene exon structure; exons ${error.conflictingExons.join(', ')} start upstream of the TSS`;
    default:
      return assertUnreachable(error);
  }
}
