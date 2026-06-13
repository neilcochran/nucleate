import type { SpliceVariant } from './splice-variant.js';

/**
 * The complete alternative-splicing profile attached to a `Gene`: the catalog of available
 * variants plus the name of the canonical default form.
 */
export interface AlternativeSplicingProfile {
  /** Gene identifier this profile applies to. */
  readonly geneId: string;

  /** All splice variants available for this gene. */
  readonly variants: readonly SpliceVariant[];

  /** Name of the variant treated as canonical when no variant is explicitly chosen. */
  readonly defaultVariant: string;
}
