import { makeDescriber } from '../result/index.js';
import type { DescriberArms } from '../result/index.js';

/**
 * Error variants produced by {@link validateSpliceVariant}: the per-variant rule checks
 * applied against a source gene's exon structure.
 *
 * - `variant-no-included-exons`: a splice variant includes no exons at all.
 * - `variant-duplicate-exon-indices`: a splice variant repeats one or more exon indices.
 * - `variant-invalid-exon-index`: a splice variant references an exon index outside the
 *   gene.
 * - `variant-skips-first-exon`: a splice variant excludes exon 0 when not permitted.
 * - `variant-skips-last-exon`: a splice variant excludes the final exon when not permitted.
 * - `variant-below-minimum-exons`: a splice variant includes fewer exons than required.
 * - `variant-not-in-frame`: a splice variant's mature sequence length is not divisible by 3.
 * - `variant-missing-start-codon`: a splice variant's first codon is not the start codon.
 * - `variant-missing-stop-codon`: a splice variant's last codon is not a stop codon.
 */
export type VariantValidationError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-no-included-exons';
      /** Name of the offending splice variant. */
      readonly variantName: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-duplicate-exon-indices';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** Distinct duplicate indices found in the variant (preserving first-seen order). */
      readonly duplicateIndices: readonly number[];
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-invalid-exon-index';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** Index that was out of range. */
      readonly exonIndex: number;
      /** Total exon count in the source gene. */
      readonly totalExons: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-skips-first-exon';
      /** Name of the offending splice variant. */
      readonly variantName: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-skips-last-exon';
      /** Name of the offending splice variant. */
      readonly variantName: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-below-minimum-exons';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** Number of exons the variant included. */
      readonly included: number;
      /** Minimum number of exons required. */
      readonly minimum: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-not-in-frame';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** Length of the variant's mature sequence in nucleotides. */
      readonly length: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-missing-start-codon';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** The first 3-base codon found (or shorter for very short variants). */
      readonly found: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant-missing-stop-codon';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** The last 3-base codon found (or shorter for very short variants). */
      readonly found: string;
    };

/**
 * Per-`kind` renderers for {@link VariantValidationError}. Exported for cross-module spread: the
 * `processing/` module folds these arms into its `splicing-failed` cause renderer rather than
 * re-enumerating the variant-validation kinds. Intentionally not re-exported from the module
 * barrel - it is internal infrastructure, reached only by deep import (the same boundary the
 * `unsafe*` factories use).
 */
export const VARIANT_VALIDATION_ERROR_ARMS: DescriberArms<VariantValidationError> = {
  'variant-no-included-exons': e => `Variant '${e.variantName}' must include at least one exon`,
  'variant-duplicate-exon-indices': e =>
    `Variant '${e.variantName}' contains duplicate exon indices: ${e.duplicateIndices.join(', ')}`,
  'variant-invalid-exon-index': e =>
    `Variant '${e.variantName}' references invalid exon index ${e.exonIndex}. Gene has ${e.totalExons} exons.`,
  'variant-skips-first-exon': e =>
    `Variant '${e.variantName}' skips the first exon, which is not allowed`,
  'variant-skips-last-exon': e =>
    `Variant '${e.variantName}' skips the last exon, which is not allowed`,
  'variant-below-minimum-exons': e =>
    `Variant '${e.variantName}' includes ${e.included} exons, but minimum required is ${e.minimum}`,
  'variant-not-in-frame': e =>
    `Variant '${e.variantName}' does not maintain reading frame: length ${e.length} is not divisible by 3`,
  'variant-missing-start-codon': e =>
    `Variant '${e.variantName}' does not start with start codon AUG, found '${e.found}'`,
  'variant-missing-stop-codon': e =>
    `Variant '${e.variantName}' does not end with stop codon, found '${e.found}'`,
};

/** Renders a {@link VariantValidationError} as a human-readable message. */
export const describeVariantValidationError = makeDescriber<VariantValidationError>(
  VARIANT_VALIDATION_ERROR_ARMS,
);
