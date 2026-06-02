import { Result, success, failure } from '../result/index.js';
import { parseRNA } from '../sequence/index.js';
import { mRNACoord } from '../coordinates/index.js';
import { type MRNA, unsafeMRNA } from './MRNA.js';
import type { MRNAError } from './errors.js';

/**
 * Reconstructs an {@link MRNA} from saved data.
 *
 * Intended for callers holding a previously-serialized mature mRNA (test fixtures, persisted
 * state). The normal path to a mature mRNA is the `processRNA(preMRNA)` pipeline, which
 * derives all inputs from a validated pre-mRNA.
 *
 * Validation:
 * 1. The RNA sequence string is parsed via {@link parseRNA}.
 * 2. Coding boundaries are all-or-nothing: supply both `codingStart` and `codingEnd` for a
 *    coding mRNA, or omit both for a non-coding mRNA. Supplying exactly one fails with
 *    `incomplete-coding-boundaries`. When both are supplied they must be finite non-negative
 *    integers with `codingStart < codingEnd <= sequence.length`.
 * 3. `polyATailLength` must be a finite non-negative integer no larger than the sequence
 *    length.
 *
 * @param sequence - The mature mRNA sequence string (will be parsed)
 * @param codingStart - 0-based inclusive index where the coding sequence begins; omit (together
 * with `codingEnd`) for a non-coding mRNA
 * @param codingEnd - 0-based exclusive index where the coding sequence ends; omit (together
 * with `codingStart`) for a non-coding mRNA
 * @param fivePrimeCap - Whether the mRNA carries a 5' cap (default `true`)
 * @param polyATailLength - Length of the 3' poly-A tail in nucleotides (default `0`)
 * @returns `Result<MRNA, MRNAError>`
 *
 * @example
 * ```typescript
 * const result = parseMRNA('AUGAAACCCGGGUAAAAAAAAAA', 0, 15, true, 10);
 * if (result.success) {
 *   console.log(result.data.codingSequence.sequence); // 'AUGAAACCCGGGUAA'
 * }
 * ```
 */
export function parseMRNA(
  sequence: string,
  codingStart?: number,
  codingEnd?: number,
  fivePrimeCap: boolean = true,
  polyATailLength: number = 0,
): Result<MRNA, MRNAError> {
  const rnaResult = parseRNA(sequence);
  if (!rnaResult.success) {
    return failure({ kind: 'invalid-sequence', cause: rnaResult.error });
  }
  const rna = rnaResult.data;
  const sequenceLength = rna.sequence.length;

  const hasCodingStart = codingStart !== undefined;
  const hasCodingEnd = codingEnd !== undefined;

  // Coding boundaries are all-or-nothing: both present (a coding mRNA) or both absent (a
  // non-coding mRNA). Exactly one is a malformed request.
  if (hasCodingStart !== hasCodingEnd) {
    return failure({ kind: 'incomplete-coding-boundaries', codingStart, codingEnd });
  }

  if (
    hasCodingStart &&
    hasCodingEnd &&
    (!Number.isInteger(codingStart) ||
      !Number.isInteger(codingEnd) ||
      codingStart < 0 ||
      codingEnd > sequenceLength ||
      codingStart >= codingEnd)
  ) {
    return failure({
      kind: 'invalid-coding-boundaries',
      codingStart,
      codingEnd,
      sequenceLength,
    });
  }

  if (
    !Number.isInteger(polyATailLength) ||
    polyATailLength < 0 ||
    polyATailLength > sequenceLength
  ) {
    return failure({
      kind: 'invalid-polya-tail-length',
      polyATailLength,
      sequenceLength,
    });
  }

  return success(
    unsafeMRNA(
      rna,
      hasCodingStart ? mRNACoord(codingStart) : undefined,
      hasCodingEnd ? mRNACoord(codingEnd) : undefined,
      fivePrimeCap,
      polyATailLength,
    ),
  );
}
