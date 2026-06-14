/**
 * Fundamental biology of polyadenylation - the constants that describe what cells actually
 * do. These values should not change without a corresponding change in biological
 * understanding. For tunable algorithm parameters (USE / DSE scoring weights, thresholds,
 * search cutoffs), see `tuning.ts`.
 *
 * Sizes are in nucleotides.
 */

/** Default mammalian poly-A tail length (adenines). */
export const DEFAULT_POLY_A_TAIL_LENGTH = 200;

/** Minimum tail length used to detect an existing poly-A tail (consecutive A's). */
export const MIN_POLY_A_DETECTION_LENGTH = 10;

/** Maximum allowed poly-A tail length. */
export const MAX_POLY_A_TAIL_LENGTH = 1000;

/** Offset (bp) from the AATAAA/AAUAAA hexamer to the typical cleavage site. */
export const POLYA_SIGNAL_OFFSET = 6;

/** Canonical polyadenylation signal in DNA (becomes AAUAAA in RNA). */
export const CANONICAL_POLYA_SIGNAL_DNA = 'AATAAA';

/**
 * Recognized polyadenylation signal variants paired with their relative strengths (0-100).
 * AAUAAA is the canonical signal; the variants reflect experimentally measured cleavage
 * efficiencies.
 */
export const POLYA_SIGNALS = {
  AAUAAA: 100,
  AUUAAA: 80,
  AGUAAA: 30,
  AAUAUA: 25,
  AAUACA: 20,
  CAUAAA: 18,
  GAUAAA: 15,
  AAAAAG: 12,
  AAAACA: 10,
} as const;

/** Default ordered list of polyadenylation signals scanned during analysis. */
export const DEFAULT_POLYA_SIGNALS = ['AAUAAA', 'AUUAAA', 'AGUAAA', 'AAUAUA', 'AAUACA'] as const;

/** Default USE motif pattern. */
export const DEFAULT_UPSTREAM_USE_PATTERN = 'U{3,}|UGUA';

/** Default DSE motif pattern. */
export const DEFAULT_DOWNSTREAM_DSE_PATTERN = 'U{3,}|GU{2,}';

/** Default cleavage-site preference order (nucleotides, most-preferred first). */
export const DEFAULT_CLEAVAGE_PREFERENCE = ['A', 'U', 'C', 'G'] as const;

/** Default range (inclusive) of distances from the signal to a valid cleavage site. */
export const DEFAULT_CLEAVAGE_DISTANCE_RANGE = [11, 23] as const;
