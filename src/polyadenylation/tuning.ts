/**
 * Tunable scoring heuristics for the polyadenylation analyzer. Changing these shifts which
 * sites the algorithm ranks or reports without changing what cells do; the underlying
 * biology lives in `biology.ts`.
 *
 * All thresholds are normalized 0-1 unless explicitly noted.
 */

/** Fallback strength for an unrecognized polyadenylation signal. */
export const DEFAULT_POLYA_SIGNAL_STRENGTH = 8;

/** Default cleavage-site offset used when no specific signal context is supplied. */
export const DEFAULT_CLEAVAGE_OFFSET = 15;

/** Minimum RNA length required before the polyadenylation analyzer will scan. */
export const MIN_RNA_SEQUENCE_FOR_POLYA_SEARCH = 20;

/** Maximum strength boost from upstream USE (Upstream Sequence Element) motifs. */
export const USE_ELEMENT_MAX_BOOST = 30;

/** Maximum strength boost from downstream DSE (Downstream Sequence Element) motifs. */
export const DSE_ELEMENT_MAX_BOOST = 20;

/** Base score used when computing polyadenylation site quality. */
export const BASE_POLYA_SCORE = 0.3;

/** Threshold (0-1) for considering a USE region high U-content. */
export const HIGH_U_CONTENT_THRESHOLD = 0.7;

/** Threshold (0-1) for considering a USE region moderately U-rich. */
export const MODERATE_U_CONTENT_THRESHOLD = 0.6;

/** Score awarded to moderate-quality USE elements. */
export const MODERATE_USE_SCORE = 0.6;

/** Penalty multiplier applied to cleavage candidates inside a poly-G run. */
export const INHIBITORY_G_RUN_PENALTY = 0.3;

/** Boost multiplier applied to cleavage candidates in A/U-rich context. */
export const AU_RICH_CONTEXT_BOOST = 1.2;

/** Score awarded to optimal USE motifs (UGUA). */
export const PERFECT_USE_SCORE = 1.0;

/** Score awarded to high-quality USE motifs (UYU). */
export const HIGH_USE_SCORE = 0.8;

/** Score awarded to optimal DSE motifs (GU-rich with U clusters). */
export const PERFECT_DSE_SCORE = 1.0;

/** Score awarded to high-quality DSE motifs (plain GU-rich). */
export const HIGH_DSE_SCORE = 0.8;

/** Minimum total strength score required for a polyadenylation site to be reported. */
export const MIN_POLYA_SITE_STRENGTH = 25;
