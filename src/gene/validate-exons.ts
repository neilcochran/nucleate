import { MIN_EXON_SIZE, MAX_EXON_SIZE, MIN_INTRON_SIZE, MAX_INTRON_SIZE } from './biology.js';
import {
  type GenomicRegion,
  validateGenomicRegion,
  findFirstOverlap,
} from '../coordinates/index.js';
import { Result, success, failure, at } from '../result/index.js';
import type { GeneError } from './errors.js';

/**
 * Validates a candidate exon list against biological gene structure rules.
 *
 * Enforces, in order:
 * - at least one exon must be supplied
 * - each exon must have non-negative coordinates with `start < end`
 * - no exon's `end` may extend past `sequenceLength`
 * - each exon must fall within `[MIN_EXON_SIZE, MAX_EXON_SIZE]` base pairs
 * - exons must be pairwise non-overlapping (detected via the shared {@link findFirstOverlap})
 * - introns implied by adjacent exons must fall within `[MIN_INTRON_SIZE, MAX_INTRON_SIZE]`
 *
 * Returns the first failure encountered as a structured {@link GeneError} so callers can branch
 * on `kind`. On success the payload is `void` - the function is a guard, not a transformation.
 *
 * @param exons - Candidate exon regions, in gene-relative coordinates; order does not matter
 * (the algorithm sorts internally for the overlap check)
 * @param sequenceLength - Length of the gene sequence the exons live within, in base pairs
 * @returns `Result<void, GeneError>`
 */
export function validateExons(
  exons: readonly GenomicRegion[],
  sequenceLength: number,
): Result<void, GeneError> {
  if (exons.length === 0) {
    return failure({ kind: 'gene/no-exons' });
  }

  // Per-exon validation: coordinates, bounds, size.
  for (let i = 0; i < exons.length; i++) {
    const exon = at(exons, i);

    if (!validateGenomicRegion(exon).success) {
      return failure({
        kind: 'gene/exon-invalid-coordinates',
        exonIndex: i,
        start: exon.start,
        end: exon.end,
      });
    }

    if (exon.end > sequenceLength) {
      return failure({
        kind: 'gene/exon-out-of-bounds',
        exonIndex: i,
        exonEnd: exon.end,
        sequenceLength,
      });
    }

    const exonLength = exon.end - exon.start;
    if (exonLength < MIN_EXON_SIZE) {
      return failure({
        kind: 'gene/exon-too-small',
        exonIndex: i,
        length: exonLength,
        min: MIN_EXON_SIZE,
      });
    }
    if (exonLength > MAX_EXON_SIZE) {
      return failure({
        kind: 'gene/exon-too-large',
        exonIndex: i,
        length: exonLength,
        max: MAX_EXON_SIZE,
      });
    }
  }

  // Overlap detection via the shared coordinates primitive.
  const overlap = findFirstOverlap(exons);
  if (overlap !== undefined) {
    return failure({
      kind: 'gene/exons-overlap',
      indices: overlap.indices,
      at: overlap.at,
    });
  }

  // Intron-size validation against sorted-by-start exons.
  if (exons.length > 1) {
    const sortedExons = [...exons].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sortedExons.length - 1; i++) {
      const current = at(sortedExons, i);
      const next = at(sortedExons, i + 1);
      const intronLength = next.start - current.end;
      if (intronLength < MIN_INTRON_SIZE) {
        return failure({
          kind: 'gene/intron-too-small',
          intronIndex: i,
          length: intronLength,
          min: MIN_INTRON_SIZE,
        });
      }
      if (intronLength > MAX_INTRON_SIZE) {
        return failure({
          kind: 'gene/intron-too-large',
          intronIndex: i,
          length: intronLength,
          max: MAX_INTRON_SIZE,
        });
      }
    }
  }

  return success(undefined);
}
