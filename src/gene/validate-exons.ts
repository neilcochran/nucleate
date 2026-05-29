import { MIN_EXON_SIZE, MAX_EXON_SIZE, MIN_INTRON_SIZE, MAX_INTRON_SIZE } from './biology.js';
import { type GenomicRegion, validateGenomicRegion } from '../coordinates/index.js';
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
 * - exons must be pairwise non-overlapping (detected via a sweep-line scan)
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
    return failure({ kind: 'no-exons' });
  }

  // Per-exon validation: coordinates, bounds, size.
  for (let i = 0; i < exons.length; i++) {
    const exon = at(exons, i);

    if (!validateGenomicRegion(exon).success) {
      return failure({
        kind: 'exon-invalid-coordinates',
        exonIndex: i,
        start: exon.start,
        end: exon.end,
      });
    }

    if (exon.end > sequenceLength) {
      return failure({
        kind: 'exon-out-of-bounds',
        exonIndex: i,
        exonEnd: exon.end,
        sequenceLength,
      });
    }

    const exonLength = exon.end - exon.start;
    if (exonLength < MIN_EXON_SIZE) {
      return failure({
        kind: 'exon-too-small',
        exonIndex: i,
        length: exonLength,
        min: MIN_EXON_SIZE,
      });
    }
    if (exonLength > MAX_EXON_SIZE) {
      return failure({
        kind: 'exon-too-large',
        exonIndex: i,
        length: exonLength,
        max: MAX_EXON_SIZE,
      });
    }
  }

  // Overlap detection via sweep-line over (position, end-before-start) events.
  if (exons.length > 1) {
    interface SweepEvent {
      position: number;
      type: 'start' | 'end';
      exonIndex: number;
    }

    const events: SweepEvent[] = [];
    for (let i = 0; i < exons.length; i++) {
      const exon = at(exons, i);
      events.push({ position: exon.start, type: 'start', exonIndex: i });
      events.push({ position: exon.end, type: 'end', exonIndex: i });
    }
    events.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      // End events before start events at the same position so adjacent exons that touch
      // (prev.end === next.start) are not flagged as overlapping.
      if (a.type === 'end' && b.type === 'start') {
        return -1;
      }
      if (a.type === 'start' && b.type === 'end') {
        return 1;
      }
      return 0;
    });

    let activeExons = 0;
    for (const event of events) {
      if (event.type === 'start') {
        if (activeExons > 0) {
          const overlapping: number[] = [];
          for (let i = 0; i < exons.length; i++) {
            const exon = at(exons, i);
            if (exon.start <= event.position && exon.end > event.position) {
              overlapping.push(i);
            }
          }
          overlapping.push(event.exonIndex);
          return failure({
            kind: 'exons-overlap',
            indices: overlapping,
            at: event.position,
          });
        }
        activeExons++;
      } else {
        activeExons--;
      }
    }
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
          kind: 'intron-too-small',
          intronIndex: i,
          length: intronLength,
          min: MIN_INTRON_SIZE,
        });
      }
      if (intronLength > MAX_INTRON_SIZE) {
        return failure({
          kind: 'intron-too-large',
          intronIndex: i,
          length: intronLength,
          max: MAX_INTRON_SIZE,
        });
      }
    }
  }

  return success(undefined);
}
