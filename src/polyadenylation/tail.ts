import { Result, success, failure } from '../result/index.js';
import type { RNA } from '../sequence/index.js';
import { unsafeRNA } from '../sequence/RNA.js';
import type { PolyadenylationSite } from './polyadenylation-site.js';
import type { PolyadenylationError } from './errors.js';
import {
  DEFAULT_POLY_A_TAIL_LENGTH,
  MAX_POLY_A_TAIL_LENGTH,
  MIN_POLY_A_DETECTION_LENGTH,
  POLY_A_TAIL_PATTERN,
} from './biology.js';
import { DEFAULT_CLEAVAGE_OFFSET } from './tuning.js';

/**
 * Cleaves the supplied {@link RNA} at `cleavageSite` (clamped to the sequence length) and
 * appends a poly-A tail of the requested length.
 *
 * Returns the resulting sequence as a plain {@link RNA}; cap state is not tracked at the
 * RNA level. Callers building a mature mRNA should compose this with `parseMRNA` /
 * `processRNA` to record the tail length and other state on the resulting `MRNA`.
 *
 * @param rna - The RNA whose 3' end is being processed
 * @param cleavageSite - 0-based cleavage position (clamped to the sequence length on the
 * upper bound, must be non-negative)
 * @param tailLength - Number of poly-A bases to append (default
 * `DEFAULT_POLY_A_TAIL_LENGTH`)
 * @returns `Result<RNA, PolyadenylationError>` carrying the cleaved-and-tailed RNA on
 * success
 */
export function add3PrimePolyATail(
  rna: RNA,
  cleavageSite: number,
  tailLength: number = DEFAULT_POLY_A_TAIL_LENGTH,
): Result<RNA, PolyadenylationError> {
  if (!Number.isInteger(cleavageSite) || cleavageSite < 0) {
    return failure({ kind: 'polyadenylation/invalid-cleavage-site', cleavageSite });
  }
  if (!Number.isInteger(tailLength) || tailLength < 0 || tailLength > MAX_POLY_A_TAIL_LENGTH) {
    return failure({
      kind: 'polyadenylation/invalid-tail-length',
      tailLength,
      max: MAX_POLY_A_TAIL_LENGTH,
    });
  }
  const sequence = rna.sequence;
  const effectiveCleavage = Math.min(cleavageSite, sequence.length);
  const cleaved = sequence.substring(0, effectiveCleavage);
  return success(unsafeRNA(cleaved + 'A'.repeat(tailLength)));
}

/**
 * Adds a 3' poly-A tail using polyadenylation-site information.
 *
 * When the supplied site carries a `cleavageSite`, that position is used; otherwise the
 * cleavage falls at the signal position plus the signal length plus
 * {@link DEFAULT_CLEAVAGE_OFFSET}.
 *
 * @param rna - The RNA whose 3' end is being processed
 * @param polySite - The polyadenylation site identified by the analyzer
 * @param tailLength - Number of poly-A bases to append (default
 * `DEFAULT_POLY_A_TAIL_LENGTH`)
 * @returns `Result<RNA, PolyadenylationError>` carrying the cleaved-and-tailed RNA on
 * success
 */
export function add3PrimePolyATailAtSite(
  rna: RNA,
  polySite: PolyadenylationSite,
  tailLength: number = DEFAULT_POLY_A_TAIL_LENGTH,
): Result<RNA, PolyadenylationError> {
  const cleavageSite =
    polySite.cleavageSite ?? polySite.position + polySite.signal.length + DEFAULT_CLEAVAGE_OFFSET;
  return add3PrimePolyATail(rna, cleavageSite, tailLength);
}

/**
 * Strips the 3' poly-A tail from the supplied {@link RNA} via sequence-level heuristic
 * (matches trailing `A+`). Returns a failure when no trailing A run is found.
 *
 * @param rna - The RNA to trim
 * @returns `Result<RNA, PolyadenylationError>` carrying the tail-free RNA on success, or a
 * `no-poly-a-tail` failure when there is no trailing poly-A run
 */
export function remove3PrimePolyATail(rna: RNA): Result<RNA, PolyadenylationError> {
  const sequence = rna.sequence;
  const trimmed = sequence.replace(POLY_A_TAIL_PATTERN, '');
  if (trimmed.length === sequence.length) {
    return failure({ kind: 'polyadenylation/no-poly-a-tail' });
  }
  return success(unsafeRNA(trimmed));
}

/**
 * Reports whether an RNA appears to carry a 3' poly-A tail of at least `minLength` trailing
 * adenines.
 *
 * Sequence-level heuristic; the function makes no claim about whether the trailing A run
 * actually represents a biologically added poly-A tail (vs. an A-rich 3'-UTR). For
 * state-aware checking on a mature mRNA, inspect {@link MRNA.polyATailLength} directly.
 *
 * @param rna - The RNA to inspect
 * @param minLength - Minimum tail length to consider present (default
 * `MIN_POLY_A_DETECTION_LENGTH`)
 * @returns `true` if the trailing A run is at least `minLength` bases
 */
export function has3PrimePolyATail(
  rna: RNA,
  minLength: number = MIN_POLY_A_DETECTION_LENGTH,
): boolean {
  const sequence = rna.sequence;
  const pattern = new RegExp(`A{${minLength},}$`);
  return pattern.test(sequence);
}

/**
 * Returns the length of the trailing `A+` run at the 3' end of the supplied {@link RNA}.
 *
 * Sequence-level heuristic; same caveats as {@link has3PrimePolyATail}.
 *
 * @param rna - The RNA to measure
 * @returns Length of the trailing A run, or `0` if none
 */
export function get3PrimePolyATailLength(rna: RNA): number {
  const match = rna.sequence.match(/A+$/);
  return match ? match[0].length : 0;
}

/**
 * Returns the {@link RNA} sequence with any trailing poly-A run stripped.
 *
 * Sequence-level operation: useful for callers analyzing the coding-plus-UTR region of a
 * mature mRNA without poly-A noise. The non-A region is returned verbatim; no cleavage-site
 * inference is attempted. A pure poly-A input has no core, so the return type encodes that
 * possibility.
 *
 * @param rna - The RNA to strip
 * @returns The tail-free sequence as RNA, or `undefined` when the input is entirely poly-A
 */
export function getCoreSequence(rna: RNA): RNA | undefined {
  const trimmed = rna.sequence.replace(POLY_A_TAIL_PATTERN, '');
  if (trimmed.length === 0) {
    return undefined;
  }
  return unsafeRNA(trimmed);
}
