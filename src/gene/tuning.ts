/**
 * Tunable search parameters for gene-structure analysis. Changing these adjusts how far the
 * splice-site search routines scan without changing the underlying biology; the biological
 * size bounds and element positions live in `biology.ts`.
 *
 * Distances are in base pairs.
 */

/** Default maximum intron length scanned by splice-site search routines. */
export const DEFAULT_MAX_INTRON_SEARCH = 10000;
