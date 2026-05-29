import { Result, success, failure, at } from '../result/index.js';
import type { GenomicRegion } from '../coordinates/index.js';
import { MIN_INTRON_LENGTH_FOR_SPLICING } from './biology.js';
import { DEFAULT_MAX_INTRON_SEARCH } from '../gene/tuning.js';
import { SPLICE_CONSENSUS } from './splice-consensus.js';
import type { SplicingError } from './errors.js';

/**
 * Validates that introns follow the canonical DNA splice-site consensus (`GT...AG`).
 *
 * Operates on DNA-side coordinates (T, not U). The matching transcript-coordinate validator
 * used internally by `spliceRNA` enforces the equivalent `GU...AG` rule on the RNA strand.
 *
 * The result carries the first failing splice-site rule (donor, acceptor, or length), so
 * callers can compose this validator with the other tagged-union failure paths in the
 * splicing pipeline.
 *
 * @param sequence - The complete DNA sequence the introns are addressed against
 * @param introns - Intron regions to validate
 * @returns `Result<void, SplicingError>` carrying the first failing rule on the failure
 * branch
 */
export function validateSpliceSites(
  sequence: string,
  introns: readonly GenomicRegion[],
): Result<void, SplicingError> {
  for (let i = 0; i < introns.length; i++) {
    const intron = at(introns, i);
    const intronSequence = sequence.substring(intron.start, intron.end);

    if (intronSequence.length < MIN_INTRON_LENGTH_FOR_SPLICING) {
      return failure({
        kind: 'intron-too-short',
        intronIndex: i,
        length: intronSequence.length,
        min: MIN_INTRON_LENGTH_FOR_SPLICING,
      });
    }

    const donor = intronSequence.substring(0, 2);
    if (donor !== SPLICE_CONSENSUS.dna.donor) {
      return failure({
        kind: 'invalid-donor-site',
        intronIndex: i,
        position: intron.start,
        found: donor,
      });
    }

    const acceptor = intronSequence.substring(intronSequence.length - 2);
    if (acceptor !== SPLICE_CONSENSUS.dna.acceptor) {
      return failure({
        kind: 'invalid-acceptor-site',
        intronIndex: i,
        position: intron.end - 2,
        found: acceptor,
      });
    }
  }

  return success(undefined);
}

/**
 * Finds candidate `GT...AG` intron regions in a DNA sequence by pairing every donor
 * occurrence with every downstream acceptor occurrence within the size constraints.
 *
 * Returns all matches sorted by start position. The function is intentionally permissive -
 * it surfaces every structural candidate without considering biological context (branch-point
 * placement, polypyrimidine tract, etc.); callers downstream apply biological scoring.
 *
 * @param sequence - DNA sequence to search
 * @param minIntronLength - Minimum intron length in bp (default
 * `MIN_INTRON_LENGTH_FOR_SPLICING`)
 * @param maxIntronLength - Maximum intron length in bp (default `DEFAULT_MAX_INTRON_SEARCH`)
 * @returns Candidate intron regions in `start`-ascending order
 */
export function findPotentialSpliceSites(
  sequence: string,
  minIntronLength: number = MIN_INTRON_LENGTH_FOR_SPLICING,
  maxIntronLength: number = DEFAULT_MAX_INTRON_SEARCH,
): GenomicRegion[] {
  const potentialIntrons: GenomicRegion[] = [];

  const gtPositions: number[] = [];
  for (let i = 0; i <= sequence.length - 2; i++) {
    if (sequence.substring(i, i + 2) === SPLICE_CONSENSUS.dna.donor) {
      gtPositions.push(i);
    }
  }

  const agPositions: number[] = [];
  for (let i = 0; i <= sequence.length - 2; i++) {
    if (sequence.substring(i, i + 2) === SPLICE_CONSENSUS.dna.acceptor) {
      agPositions.push(i);
    }
  }

  for (const gtPos of gtPositions) {
    for (const agPos of agPositions) {
      if (agPos <= gtPos) {
        continue;
      }
      const intronStart = gtPos;
      const intronEnd = agPos + 2;
      const intronLength = intronEnd - intronStart;
      if (
        intronLength >= minIntronLength &&
        intronLength <= maxIntronLength &&
        intronEnd <= sequence.length
      ) {
        potentialIntrons.push({
          start: intronStart,
          end: intronEnd,
          name: `potential_intron_${intronStart}_${intronEnd}`,
        });
      }
    }
  }

  return potentialIntrons.sort((a, b) => a.start - b.start);
}
