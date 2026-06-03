/**
 * Tunable search parameters for splice-site analysis. Changing these adjusts how far the
 * splice-site search routines scan without changing the underlying biology; the biological splice
 * constants live in `biology.ts`.
 *
 * Distances are in base pairs.
 */

/** Default maximum intron length scanned by `findPotentialSpliceSites`. */
export const DEFAULT_MAX_INTRON_SEARCH = 10000;
