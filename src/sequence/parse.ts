import { Result, success, failure } from '../result/index.js';
import { type DNA, unsafeDNA } from './DNA.js';
import { type RNA, unsafeRNA } from './RNA.js';
import { type DoubleStrandedDNA, unsafeDoubleStrandedDNA } from './DoubleStrandedDNA.js';
import type { DNAError, RNAError, DoubleStrandedError } from './errors.js';
import { validateDNAString, validateRNAString } from './internal-validation.js';

/**
 * Parses an untrusted string as a {@link DNA} sequence.
 *
 * Accepts characters from `{A, C, G, T}` case-insensitively; the resulting `DNA` carries the
 * sequence in upper-case. The failure branch carries a structured {@link DNAError} so
 * callers can branch on the failure kind (`empty-sequence` vs `invalid-characters`) and
 * inspect the offending characters.
 *
 * @param input - Untrusted candidate sequence string
 * @returns `Result` whose success branch carries a `DNA` and whose failure branch carries
 * a `DNAError`
 *
 * @example
 * ```typescript
 * const result = parseDNA('atcg');
 * if (result.success) {
 *   console.log(result.data.sequence); // 'ATCG'
 * }
 * ```
 */
export function parseDNA(input: string): Result<DNA, DNAError> {
  const outcome = validateDNAString(input);
  if (!outcome.success) {
    return failure(outcome.error);
  }
  return success(unsafeDNA(outcome.data));
}

/**
 * Parses an untrusted string as an {@link RNA} sequence.
 *
 * Accepts characters from `{A, C, G, U}` case-insensitively; the resulting `RNA` carries the
 * sequence in upper-case. The failure branch carries a structured {@link RNAError} so
 * callers can branch on the failure kind (`empty-sequence` vs `invalid-characters`) and
 * inspect the offending characters.
 *
 * @param input - Untrusted candidate sequence string
 * @returns `Result` whose success branch carries an `RNA` and whose failure branch carries
 * an `RNAError`
 *
 * @example
 * ```typescript
 * const result = parseRNA('aucg');
 * if (result.success) {
 *   console.log(result.data.sequence); // 'AUCG'
 * }
 * ```
 */
export function parseRNA(input: string): Result<RNA, RNAError> {
  const outcome = validateRNAString(input);
  if (!outcome.success) {
    return failure(outcome.error);
  }
  return success(unsafeRNA(outcome.data));
}

/**
 * Validates that a pair of {@link DNA} strands form a valid double-stranded duplex.
 *
 * The pair is valid when both strands have the same length and the reverse strand (read
 * 5'-to-3') equals the reverse complement of the forward strand (read 5'-to-3'). Equivalently,
 * `reverse.sequence === forward.getReverseComplement().sequence`.
 *
 * @param forward - Forward strand of the duplex, oriented 5'-to-3'
 * @param reverse - Reverse strand of the duplex, oriented 5'-to-3'; must equal
 * `forward.getReverseComplement()`
 * @returns `Result.success` containing a `DoubleStrandedDNA` when the strands form a duplex;
 * `Result.failure` carrying a {@link DoubleStrandedError} otherwise
 *
 * @example
 * ```typescript
 * const forward = parseDNA('ATCG').unwrap();
 * const reverse = parseDNA('CGAT').unwrap();
 * const result = parseDoubleStrandedDNA(forward, reverse);
 * if (result.success) {
 *   result.data.forward.sequence; // 'ATCG'
 *   result.data.reverse.sequence; // 'CGAT'
 * }
 * ```
 */
export function parseDoubleStrandedDNA(
  forward: DNA,
  reverse: DNA,
): Result<DoubleStrandedDNA, DoubleStrandedError> {
  if (forward.sequence.length !== reverse.sequence.length) {
    return failure({
      kind: 'length-mismatch',
      forwardLength: forward.sequence.length,
      reverseLength: reverse.sequence.length,
    });
  }
  const expected = forward.getReverseComplement().sequence;
  // Fast-path guard: the native compare gates the common valid duplex; the char loop below runs
  // only on mismatch, solely to locate the first differing index for the error payload.
  if (expected !== reverse.sequence) {
    for (let i = 0; i < expected.length; i++) {
      const expectedChar = expected.charAt(i);
      const actualChar = reverse.sequence.charAt(i);
      if (expectedChar !== actualChar) {
        return failure({
          kind: 'not-complementary',
          firstMismatchAt: i,
          expected: expectedChar,
          actual: actualChar,
        });
      }
    }
  }
  return success(unsafeDoubleStrandedDNA(forward, reverse));
}

/**
 * Constructs a {@link DoubleStrandedDNA} from a single forward strand, synthesizing the
 * reverse strand as the reverse complement of the input.
 *
 * Infallible: the input is already a validated {@link DNA}, and the reverse-complement
 * derivation cannot fail. Use this when you only have one strand and want a duplex (the
 * common case for replication callers); use {@link parseDoubleStrandedDNA} when you have a
 * pair of strands and need to validate they form a duplex.
 *
 * @param forward - Forward strand of the duplex, oriented 5'-to-3'
 * @returns A new `DoubleStrandedDNA` with the synthesized reverse strand
 *
 * @example
 * ```typescript
 * const forward = parseDNA('ATCG').unwrap();
 * const duplex = doubleStrandedDNA(forward);
 * duplex.reverse.sequence; // 'CGAT'
 * ```
 */
export function doubleStrandedDNA(forward: DNA): DoubleStrandedDNA {
  return unsafeDoubleStrandedDNA(forward, forward.getReverseComplement());
}
