import type { SpliceVariant } from '../variants/index.js';
import type { MRNA } from '../modifications/index.js';
import type { Polypeptide } from '../translation/index.js';
import type { ProcessingError } from './errors.js';

/**
 * Per-variant outcome of enumerating a gene's splicing profile via `processAllSplicingVariants`.
 * Exactly one result is produced for every variant in the profile, tagged by its fate so that no
 * variant is silently dropped:
 *
 * - `translated`: the variant spliced, processed, and translated into a {@link Polypeptide}.
 * - `no-protein`: the variant produced a mature {@link MRNA} but no coding sequence, so there is
 *   no protein - the honest outcome of a variant that abolishes the CDS (e.g. a start-codon
 *   knockout). Surfaced rather than dropped because, in a mutation context, the
 *   protein-abolishing variants are often the interesting ones.
 * - `invalid`: the variant could not be spliced or processed at all; carries the structured
 *   {@link ProcessingError}.
 *
 * Callers wanting only the productive variants filter on `kind === 'translated'`.
 */
export type SpliceVariantResult =
  | {
      /** Discriminator naming the outcome. */
      readonly kind: 'translated';
      /** The splice variant this result describes. */
      readonly variant: SpliceVariant;
      /** The mature mRNA produced by processing the variant. */
      readonly matureMRNA: MRNA;
      /** The polypeptide translated from the mature mRNA's coding sequence. */
      readonly polypeptide: Polypeptide;
    }
  | {
      /** Discriminator naming the outcome. */
      readonly kind: 'no-protein';
      /** The splice variant this result describes. */
      readonly variant: SpliceVariant;
      /** The mature mRNA produced by the variant; it carries no coding sequence. */
      readonly matureMRNA: MRNA;
    }
  | {
      /** Discriminator naming the outcome. */
      readonly kind: 'invalid';
      /** The splice variant this result describes. */
      readonly variant: SpliceVariant;
      /** The splicing/processing failure that prevented a mature mRNA. */
      readonly error: ProcessingError;
    };
