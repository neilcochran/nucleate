import type { GenomicRegion } from '../coordinates/index.js';
import {
  DEFAULT_POLYA_SIGNALS,
  DEFAULT_UPSTREAM_USE_PATTERN,
  DEFAULT_DOWNSTREAM_DSE_PATTERN,
  DEFAULT_CLEAVAGE_PREFERENCE,
  DEFAULT_CLEAVAGE_DISTANCE_RANGE,
} from './biology.js';

/**
 * A detected polyadenylation site, with the signal sequence, its strength score, and any
 * regulatory elements (USE / DSE) and predicted cleavage position the scorer was able to
 * identify.
 *
 * `strength` is on an approximate 0-100 scale for the bare signal, with USE / DSE boosts
 * pushing strong sites above 100 (capped at the internal `MAX_POLYA_SITE_STRENGTH_WITH_BOOST`
 * value used by the site scorer). Higher values indicate a more biologically active site.
 */
export interface PolyadenylationSite {
  /** Position of the polyadenylation signal in the sequence (0-based). */
  readonly position: number;

  /** The actual signal sequence found (e.g. `'AAUAAA'`, `'AUUAAA'`). */
  readonly signal: string;

  /** Strength score; canonical signals score ~100, alternatives lower. */
  readonly strength: number;

  /** Upstream sequence element (U-rich, UGUA motifs) that enhances cleavage efficiency. */
  readonly upstreamUSE?: GenomicRegion;

  /** Downstream sequence element (GU-rich, U-rich) that enhances cleavage efficiency. */
  readonly downstreamDSE?: GenomicRegion;

  /** Predicted cleavage position (11-23 bp downstream of signal, by default). */
  readonly cleavageSite?: number;
}

/**
 * Options governing polyadenylation-site recognition: which signals to search for, what USE
 * / DSE patterns to look for, which nucleotides cleavage prefers, and the distance range
 * from signal to cleavage site.
 */
export interface CleavageSiteOptions {
  /** Polyadenylation signals to search for, in caller preference order. */
  readonly polyASignal?: readonly string[];

  /** Pattern for upstream sequence elements (USE). */
  readonly upstreamUSE?: string;

  /** Pattern for downstream sequence elements (DSE). */
  readonly downstreamDSE?: string;

  /** Nucleotide preference at cleavage site: A \> U \> C \>\> G. */
  readonly cleavagePreference?: readonly string[];

  /** Distance range from poly-A signal to cleavage site (`[min, max]`). */
  readonly distanceRange?: readonly [number, number];
}

/**
 * Default {@link CleavageSiteOptions} based on the canonical biological signals. Typed as
 * `Required<CleavageSiteOptions>` so internal helpers receive a known-populated shape after
 * merging with the caller's partial overrides.
 */
export const DEFAULT_CLEAVAGE_OPTIONS: Required<CleavageSiteOptions> = {
  polyASignal: DEFAULT_POLYA_SIGNALS,
  upstreamUSE: DEFAULT_UPSTREAM_USE_PATTERN,
  downstreamDSE: DEFAULT_DOWNSTREAM_DSE_PATTERN,
  cleavagePreference: DEFAULT_CLEAVAGE_PREFERENCE,
  distanceRange: DEFAULT_CLEAVAGE_DISTANCE_RANGE,
} as const;
