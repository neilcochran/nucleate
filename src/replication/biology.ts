/**
 * Replication-specific biological facts - the RNA primer length bounds that describe what cells
 * actually do. These values should not change without a corresponding change in biological
 * understanding.
 *
 * Lives alongside the replication module rather than in a global constants file because the
 * values are not consumed by any other domain.
 */

/** Minimum RNA primer length in nucleotides, per the biological 3-10 nt range. */
export const MIN_RNA_PRIMER_LENGTH = 3;

/** Maximum RNA primer length in nucleotides, per the biological 3-10 nt range. */
export const MAX_RNA_PRIMER_LENGTH = 10;
