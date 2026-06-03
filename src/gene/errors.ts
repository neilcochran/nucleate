/**
 * Tagged-union errors raised by the gene-level parsers and validators. The `kind` discriminators
 * are namespaced under `gene/`, `promoter/`, and `promoter-element/`. Human-readable messages are
 * produced centrally by `describeError` (see `src/describe.ts`).
 */

import type { DNAError } from '../sequence/index.js';
import type { VariantValidationError } from '../variants/index.js';

/**
 * Error variants produced by `parseGene` and the validators it composes.
 *
 * Covers DNA-sequence failures (`gene/invalid-sequence`), the exon-structure rules enforced by
 * `validateExons` (`gene/no-exons` through `gene/intron-too-large`), profile-level splicing checks
 * (`gene/invalid-splicing-profile`), and per-variant splicing checks (`gene/invalid-variant`,
 * which carries the structured {@link VariantValidationError} produced by `validateSpliceVariant`).
 */
export type GeneError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/invalid-sequence';
      /** Underlying DNA-parser failure that produced this gene error. */
      readonly cause: DNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/no-exons';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/exon-invalid-coordinates';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** `start` value as supplied. */
      readonly start: number;
      /** `end` value as supplied. */
      readonly end: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/exon-out-of-bounds';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** `end` coordinate of the offending exon. */
      readonly exonEnd: number;
      /** Length of the gene sequence the exon was checked against. */
      readonly sequenceLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/exon-too-small';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** Length of the exon in base pairs. */
      readonly length: number;
      /** Minimum exon length required, in base pairs. */
      readonly min: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/exon-too-large';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** Length of the exon in base pairs. */
      readonly length: number;
      /** Maximum exon length allowed, in base pairs. */
      readonly max: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/exons-overlap';
      /**
       * Indices (into the caller's exon array) of the first overlapping pair, ordered by gene
       * start position; the exon at `indices[1]` starts at {@link at}.
       */
      readonly indices: readonly [number, number];
      /** Gene-relative position where the overlap was detected (the later exon's start). */
      readonly at: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/intron-too-small';
      /** 0-based index of the offending intron (numbered from the 5'-most one). */
      readonly intronIndex: number;
      /** Length of the intron in base pairs. */
      readonly length: number;
      /** Minimum intron length required, in base pairs. */
      readonly min: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/intron-too-large';
      /** 0-based index of the offending intron (numbered from the 5'-most one). */
      readonly intronIndex: number;
      /** Length of the intron in base pairs. */
      readonly length: number;
      /** Maximum intron length allowed, in base pairs. */
      readonly max: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'gene/invalid-splicing-profile';
      /** Free-form reason describing what the profile-level validator rejected. */
      readonly reason: string;
    }
  | {
      /**
       * Discriminator naming the failure mode. Fires when a per-variant rule rejects one of the
       * profile's variants. The structured cause is the {@link VariantValidationError} produced by
       * `validateSpliceVariant`.
       */
      readonly kind: 'gene/invalid-variant';
      /** Underlying per-variant validation failure. */
      readonly cause: VariantValidationError;
    };

/**
 * Error variants produced by `parsePromoter`.
 *
 * - `promoter/invalid-tss`: the transcription start site is not a finite, non-negative integer.
 */
export type PromoterError = {
  /** Discriminator naming the failure mode. */
  readonly kind: 'promoter/invalid-tss';
  /** The TSS value the caller supplied. */
  readonly tss: number;
};

/**
 * Error variants produced by `parsePromoterElement`.
 *
 * - `promoter-element/empty-name`: the supplied element name is the empty string.
 * - `promoter-element/invalid-position`: the position-relative-to-TSS is not a finite integer.
 * - `promoter-element/invalid-score-weight`: the score weight is not a finite number.
 */
export type PromoterElementError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'promoter-element/empty-name';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'promoter-element/invalid-position';
      /** The position value the caller supplied. */
      readonly position: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'promoter-element/invalid-score-weight';
      /** The score-weight value the caller supplied. */
      readonly scoreWeight: number;
    };
