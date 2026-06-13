/**
 * Generic, coordinate-system-agnostic genomic region type and helpers.
 *
 * The biological constraints that depend on a particular coordinate space (exon size limits,
 * intron length, splice-site validation) live in the domain modules that own them. This file
 * only carries the pure-shape pieces: the parameterized region interface and helpers that
 * work uniformly across coordinate spaces.
 */

import { Result, success, failure, at } from '../result/index.js';

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
      readonly kind: 'region/negative-start';
      /** The `start` value the caller supplied. */
      readonly start: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'region/negative-end';
      /** The `end` value the caller supplied. */
      readonly end: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'region/start-not-before-end';
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
    return failure({ kind: 'region/negative-start', start: region.start });
  }
  if (region.end < 0) {
    return failure({ kind: 'region/negative-end', end: region.end });
  }
  if (region.start >= region.end) {
    return failure({ kind: 'region/start-not-before-end', start: region.start, end: region.end });
  }
  return success(undefined);
}

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
 * Finds the first overlapping pair in a list of regions, scanning in ascending start order.
 *
 * Sorts a copy of the list by `start` and scans adjacent pairs; the first pair whose
 * earlier-starting region's `end` exceeds the later-starting region's `start` is reported. A
 * sorted adjacent scan suffices to find any overlap: once sorted by `start`, if no adjacent pair
 * overlaps then `r[i].end <= r[i+1].start <= r[j].start` for every `j > i`, so no pair overlaps
 * at all. Touching boundaries (`prev.end === next.start`) are allowed.
 *
 * The reported `indices` are positions in the caller's input array (preserved across the internal
 * sort), ordered by genomic start: `indices[0]` is the earlier-starting region and `indices[1]`
 * the later-starting one, whose `start` equals `at`.
 *
 * @param regions - The regions to check, in any single coordinate space; order does not matter
 * @returns The first overlapping pair as `{ indices: [earlier, later], at }`, or `undefined` when
 * the regions are pairwise non-overlapping
 * @typeParam C - The coordinate-space brand (inferred)
 */
export function findFirstOverlap<C extends number>(
  regions: readonly GenomicRegion<C>[],
): { indices: [number, number]; at: number } | undefined {
  if (regions.length <= 1) {
    return undefined;
  }

  const sorted = regions
    .map((region, index) => ({ region, index }))
    .sort((a, b) => a.region.start - b.region.start);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = at(sorted, i);
    const next = at(sorted, i + 1);
    if (current.region.end > next.region.start) {
      return { indices: [current.index, next.index], at: next.region.start };
    }
  }

  return undefined;
}

/**
 * Tests whether a list of regions are pairwise non-overlapping.
 *
 * Thin wrapper over {@link findFirstOverlap}: the regions are non-overlapping exactly when no
 * first overlap exists. Touching boundaries (`prev.end === next.start`) are allowed.
 *
 * @param regions - The regions to check
 * @returns `true` if no two regions overlap
 * @typeParam C - The coordinate-space brand (inferred)
 */
export function validateNonOverlappingRegions<C extends number>(
  regions: GenomicRegion<C>[],
): boolean {
  return findFirstOverlap(regions) === undefined;
}
