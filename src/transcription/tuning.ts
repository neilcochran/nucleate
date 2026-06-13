/**
 * Tunable algorithm parameters for the transcription pipeline - promoter search distances, the
 * TSS-proximity threshold, and the minimum promoter strength to report. Changing these shifts
 * which promoters `transcribe` and promoter-recognition find or report without changing the
 * underlying biology.
 *
 * Distances and thresholds are in base pairs. Defaults reflect what the implementations use
 * when the caller does not supply an override.
 */

/**
 * Maximum upstream search distance scanned by `promoter-recognition` when locating promoter
 * elements relative to a TSS candidate. Covers TATA box (-30), CAAT box (-80), and the rest
 * of the proximal promoter elements.
 */
export const MAX_PROMOTER_SEARCH_DISTANCE = 200;

/** Maximum upstream search window for `transcribe` when locating a promoter. */
export const DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE = 1000;

/** Default downstream search distance for promoter elements relative to TSS. */
export const DEFAULT_DOWNSTREAM_SEARCH_DISTANCE = 100;

/** Maximum distance (bp) between TSS candidates to consider them the same site. */
export const TSS_PROXIMITY_THRESHOLD = 10;

/** Default minimum promoter strength required for transcription to proceed. */
export const DEFAULT_MIN_PROMOTER_STRENGTH = 5;
