/**
 * Tagged-union errors raised by the gene-level parsers and validators.
 *
 * One union per parser - {@link GeneError}, {@link PromoterError}, {@link PromoterElementError} -
 * so callers can branch on `kind` and TypeScript narrows the surrounding fields. Human-readable
 * messages are produced by the renderer functions below rather than carried alongside the
 * structured payload.
 */

import type { DNAError } from '../sequence/index.js';
import { describeDNAError } from '../sequence/index.js';
import type { VariantValidationError } from '../variants/errors.js';
import { describeVariantValidationError } from '../variants/errors.js';
import { assertUnreachable } from '../result/index.js';

/**
 * Error variants produced by `parseGene` and the validators it composes.
 *
 * Covers DNA-sequence failures (`invalid-sequence`), the exon-structure rules enforced by
 * `validateExons` (`no-exons` through `intron-too-large`), profile-level splicing checks
 * (`invalid-splicing-profile`), and per-variant splicing checks (`invalid-variant`, which
 * carries the structured {@link VariantValidationError} produced by `validateSpliceVariant`).
 */
export type GeneError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-sequence';
      /** Underlying DNA-parser failure that produced this gene error. */
      readonly cause: DNAError;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'no-exons';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'exon-invalid-coordinates';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** `start` value as supplied. */
      readonly start: number;
      /** `end` value as supplied. */
      readonly end: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'exon-out-of-bounds';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** `end` coordinate of the offending exon. */
      readonly exonEnd: number;
      /** Length of the gene sequence the exon was checked against. */
      readonly sequenceLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'exon-too-small';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** Length of the exon in base pairs. */
      readonly length: number;
      /** Minimum exon length required, in base pairs. */
      readonly min: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'exon-too-large';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** Length of the exon in base pairs. */
      readonly length: number;
      /** Maximum exon length allowed, in base pairs. */
      readonly max: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'exons-overlap';
      /** Indices of the overlapping exons. */
      readonly indices: readonly number[];
      /** Gene-relative position where the overlap was detected. */
      readonly at: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'intron-too-small';
      /** 0-based index of the offending intron (numbered from the 5'-most one). */
      readonly intronIndex: number;
      /** Length of the intron in base pairs. */
      readonly length: number;
      /** Minimum intron length required, in base pairs. */
      readonly min: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'intron-too-large';
      /** 0-based index of the offending intron (numbered from the 5'-most one). */
      readonly intronIndex: number;
      /** Length of the intron in base pairs. */
      readonly length: number;
      /** Maximum intron length allowed, in base pairs. */
      readonly max: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-splicing-profile';
      /** Free-form reason describing what the profile-level validator rejected. */
      readonly reason: string;
    }
  | {
      /**
       * Discriminator naming the failure mode. Fires when a per-variant rule (index range,
       * first/last exon presence, reading frame, codons, etc.) rejects one of the profile's
       * variants. The structured cause is the {@link VariantValidationError} produced by
       * `validateSpliceVariant`.
       */
      readonly kind: 'invalid-variant';
      /** Underlying per-variant validation failure. */
      readonly cause: VariantValidationError;
    };

/**
 * Error variants produced by `parsePromoter`.
 *
 * - `invalid-tss`: the transcription start site is not a finite, non-negative integer.
 */
export type PromoterError = {
  /** Discriminator naming the failure mode. */
  readonly kind: 'invalid-tss';
  /** The TSS value the caller supplied. */
  readonly tss: number;
};

/**
 * Error variants produced by `parsePromoterElement`.
 *
 * - `empty-name`: the supplied element name is the empty string.
 * - `invalid-position`: the position-relative-to-TSS is not a finite integer.
 * - `invalid-score-weight`: the score weight is not a finite number.
 */
export type PromoterElementError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'empty-name';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-position';
      /** The position value the caller supplied. */
      readonly position: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-score-weight';
      /** The score-weight value the caller supplied. */
      readonly scoreWeight: number;
    };

/** Renders a {@link GeneError} as a human-readable message. */
export function describeGeneError(error: GeneError): string {
  switch (error.kind) {
    case 'invalid-sequence':
      return `Invalid gene sequence: ${describeDNAError(error.cause)}`;
    case 'no-exons':
      return 'Gene must have at least one exon';
    case 'exon-invalid-coordinates':
      return `Exon ${error.exonIndex} has invalid coordinates: start=${error.start}, end=${error.end}`;
    case 'exon-out-of-bounds':
      return `Exon ${error.exonIndex} extends beyond sequence length: end=${error.exonEnd}, sequence length=${error.sequenceLength}`;
    case 'exon-too-small':
      return `Exon ${error.exonIndex} is too small: ${error.length} bp (minimum ${error.min} bp required)`;
    case 'exon-too-large':
      return `Exon ${error.exonIndex} is unrealistically large: ${error.length} bp (maximum ${error.max} bp)`;
    case 'exons-overlap':
      return `Exon overlap detected at position ${error.at}. Overlapping exons: ${error.indices.join(', ')}`;
    case 'intron-too-small':
      return `Intron ${error.intronIndex} is too small: ${error.length} bp (minimum ${error.min} bp required for proper splicing)`;
    case 'intron-too-large':
      return `Intron ${error.intronIndex} is unrealistically large: ${error.length} bp (maximum ${error.max} bp)`;
    case 'invalid-splicing-profile':
      return error.reason;
    case 'invalid-variant':
      return describeVariantValidationError(error.cause);
    default:
      return assertUnreachable(error);
  }
}

/** Renders a {@link PromoterError} as a human-readable message. */
export function describePromoterError(error: PromoterError): string {
  switch (error.kind) {
    case 'invalid-tss':
      return `Promoter transcription start site must be a finite non-negative integer; received ${error.tss}`;
  }
}

/** Renders a {@link PromoterElementError} as a human-readable message. */
export function describePromoterElementError(error: PromoterElementError): string {
  switch (error.kind) {
    case 'empty-name':
      return 'Promoter element name cannot be empty';
    case 'invalid-position':
      return `Promoter element position must be a finite integer; received ${error.position}`;
    case 'invalid-score-weight':
      return `Promoter element score weight must be a finite number; received ${error.scoreWeight}`;
    default:
      return assertUnreachable(error);
  }
}
