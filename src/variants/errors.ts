/**
 * Error variants produced by `validateSpliceVariant` (in `gene/`): the per-variant rule checks
 * applied against a source gene's exon structure. The `kind` discriminators are namespaced under
 * `variant/`. Human-readable messages are produced centrally by `describeError`
 * (see `src/describe.ts`).
 *
 * - `variant/no-included-exons`: a splice variant includes no exons at all.
 * - `variant/duplicate-exon-indices`: a splice variant repeats one or more exon indices.
 * - `variant/invalid-exon-index`: a splice variant references an exon index outside the gene.
 * - `variant/skips-first-exon`: a splice variant excludes exon 0 when not permitted.
 * - `variant/skips-last-exon`: a splice variant excludes the final exon when not permitted.
 * - `variant/below-minimum-exons`: a splice variant includes fewer exons than required.
 * - `variant/not-in-frame`: a splice variant's mature sequence length is not divisible by 3.
 * - `variant/missing-start-codon`: a splice variant's first codon is not the start codon.
 * - `variant/missing-stop-codon`: a splice variant's last codon is not a stop codon.
 */
export type VariantValidationError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/no-included-exons';
      /** Name of the offending splice variant. */
      readonly variantName: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/duplicate-exon-indices';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** Distinct duplicate indices found in the variant (preserving first-seen order). */
      readonly duplicateIndices: readonly number[];
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/invalid-exon-index';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** Index that was out of range. */
      readonly exonIndex: number;
      /** Total exon count in the source gene. */
      readonly totalExons: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/skips-first-exon';
      /** Name of the offending splice variant. */
      readonly variantName: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/skips-last-exon';
      /** Name of the offending splice variant. */
      readonly variantName: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/below-minimum-exons';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** Number of exons the variant included. */
      readonly included: number;
      /** Minimum number of exons required. */
      readonly minimum: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/not-in-frame';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** Length of the variant's mature sequence in nucleotides. */
      readonly length: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/missing-start-codon';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** The first 3-base codon found (or shorter for very short variants). */
      readonly found: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'variant/missing-stop-codon';
      /** Name of the offending splice variant. */
      readonly variantName: string;
      /** The last 3-base codon found (or shorter for very short variants). */
      readonly found: string;
    };
