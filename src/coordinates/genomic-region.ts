/**
 * Generic, coordinate-system-agnostic genomic region type and helpers.
 *
 * The biological constraints that depend on a particular coordinate space (exon size limits,
 * intron length, splice-site validation) live in the domain modules that own them. This file
 * only carries the pure-shape pieces: the parameterized region interface and helpers that
 * work uniformly across coordinate spaces.
 */

import { Result, success, failure, makeDescriber, at } from '../result/index.js';

/**
 * A region within a sequence, expressed in 0-based half-open coordinates `[start, end)`.
 *
 * Parameterized by the coordinate space `C` so the type system can prevent accidentally
 * mixing gene-relative and transcript-relative regions. Existing callers that do not yet
 * care about coordinate spaces can use `GenomicRegion` (defaults to plain `number`);
 * brand-aware callers use e.g. `GenomicRegion<GeneCoord>` or `GenomicRegion<TranscriptCoord>`.
 *
 * @typeParam C - The numeric type used for `start` and `end`. Constrained to `number` so brands
 * (which intersect with `number`) and plain numbers both fit; defaults to `number`.
 */
export interface GenomicRegion<C extends number = number> {
  /** 0-based inclusive start position. */
  start: C;

  /** 0-based exclusive end position. */
  end: C;

  /** Optional identifier for the region. */
  name?: string;
}

/**
 * Tagged-union failure raised by {@link validateGenomicRegion}.
 *
 * - `negative-start`: `start` is below zero.
 * - `negative-end`: `end` is below zero.
 * - `start-not-before-end`: `start >= end`, leaving an empty or inverted interval.
 */
export type RegionError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'negative-start';
      /** The `start` value the caller supplied. */
      readonly start: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'negative-end';
      /** The `end` value the caller supplied. */
      readonly end: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'start-not-before-end';
      /** The `start` value the caller supplied. */
      readonly start: number;
      /** The `end` value the caller supplied. */
      readonly end: number;
    };

/**
 * Validates a {@link GenomicRegion} for basic positional sanity: non-negative coordinates and
 * `start < end`.
 *
 * Biological constraints (minimum sizes, splice-site shape, etc.) are enforced separately by
 * the domain modules that own them. The structured `RegionError` payload identifies which
 * specific rule failed, letting callers either surface that reason or substitute their own
 * domain-specific error.
 *
 * @param region - The region to validate
 * @returns `Result<void, RegionError>`
 * @typeParam C - The coordinate-space brand (inferred)
 */
export function validateGenomicRegion<C extends number>(
  region: GenomicRegion<C>,
): Result<void, RegionError> {
  if (region.start < 0) {
    return failure({ kind: 'negative-start', start: region.start });
  }
  if (region.end < 0) {
    return failure({ kind: 'negative-end', end: region.end });
  }
  if (region.start >= region.end) {
    return failure({ kind: 'start-not-before-end', start: region.start, end: region.end });
  }
  return success(undefined);
}

/** Renders a {@link RegionError} as a human-readable message. */
export const describeRegionError = makeDescriber<RegionError>({
  'negative-start': e => `Region start ${e.start} must be non-negative`,
  'negative-end': e => `Region end ${e.end} must be non-negative`,
  'start-not-before-end': e =>
    `Region start (${e.start}) must be strictly less than end (${e.end})`,
});

/**
 * Tests whether two regions in the same coordinate space overlap.
 *
 * Regions touch but do not overlap when one's `end` equals the other's `start` (since the
 * convention is half-open).
 *
 * @param region1 - First region
 * @param region2 - Second region (must share `region1`'s coordinate space)
 * @returns `true` if the regions overlap
 * @typeParam C - The coordinate-space brand (inferred)
 */
export function regionsOverlap<C extends number>(
  region1: GenomicRegion<C>,
  region2: GenomicRegion<C>,
): boolean {
  return region1.start < region2.end && region2.start < region1.end;
}

/**
 * Derives intron regions from an exon list by emitting one region for each adjacent pair of
 * sorted exons where the gap is strictly positive.
 *
 * The returned regions inherit the input exons' coordinate brand `C`; the helper performs no
 * naming or validation. Touching exons (`prev.end === next.start`) produce no intron;
 * overlapping exons are not checked here (the caller should run
 * {@link validateNonOverlappingRegions} or the domain-specific equivalent before calling).
 *
 * Used by gene-coordinate intron derivation in {@link parseGene} (which maps the result to add
 * `intron${n}` names) and by transcript-coordinate intron derivation in `unsafePreMRNA`.
 *
 * @param exons - Exon regions in any single coordinate space; order does not matter (the
 * algorithm sorts internally)
 * @returns Intron regions, in sorted-exon-pair order, with `name` left undefined
 * @typeParam C - The coordinate-space brand (inferred)
 */
export function deriveIntronsFromExons<C extends number>(
  exons: readonly GenomicRegion<C>[],
): GenomicRegion<C>[] {
  if (exons.length <= 1) {
    return [];
  }
  const sorted = [...exons].sort((a, b) => a.start - b.start);
  const introns: GenomicRegion<C>[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = at(sorted, i);
    const next = at(sorted, i + 1);
    if (current.end < next.start) {
      introns.push({ start: current.end, end: next.start, name: undefined });
    }
  }
  return introns;
}

/**
 * Tests whether a list of regions are pairwise non-overlapping.
 *
 * Sorts a copy of the list by `start` and then scans adjacent pairs. Touching boundaries
 * (`prev.end === next.start`) are allowed.
 *
 * @param regions - The regions to check
 * @returns `true` if no two regions overlap
 * @typeParam C - The coordinate-space brand (inferred)
 */
export function validateNonOverlappingRegions<C extends number>(
  regions: GenomicRegion<C>[],
): boolean {
  if (regions.length <= 1) {
    return true;
  }

  const sorted = [...regions].sort((a, b) => a.start - b.start);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = at(sorted, i);
    const next = at(sorted, i + 1);
    if (current.end > next.start) {
      return false;
    }
  }

  return true;
}
