import { Result, success, failure } from '../result/index.js';
import type { RNA } from './RNA.js';
import type { ReadingFrameError, CodonError } from './errors.js';

/**
 * Length of a codon in nucleotides. Always 3 for the standard genetic code.
 */
export const CODON_LENGTH = 3;

/**
 * A validated RNA codon: an {@link RNA} sequence whose length is exactly {@link CODON_LENGTH}.
 *
 * Branded subtype of `RNA` so the type system distinguishes "any RNA" from "RNA known to be
 * codon-length." Functions that take a `Codon` will reject a general `RNA`; functions that take
 * an `RNA` continue to accept `Codon` (since `Codon` is an `RNA`). All `RNA` methods
 * (`.sequence`, `.length()`, complements) work on `Codon` unchanged. This is deliberately a
 * brand-on-an-entity (a length-refined `RNA`), not a third construction mechanism alongside the
 * parser-constructed classes and the factory-built branded records.
 *
 * Construct via {@link parseCodon} for untrusted input, or via `unsafeCodon` for in-tree
 * callers that have already verified the length invariant.
 */
export type Codon = RNA & {
  /** Type-level brand. Not present at runtime. */
  readonly __codon: 'Codon';
};

/**
 * Brands a validated {@link RNA} as a {@link Codon}, enforcing the length-3 invariant.
 *
 * @param rna - The candidate RNA sequence
 * @returns `Result.success` containing the branded `Codon` when `rna.sequence.length === CODON_LENGTH`,
 * or `Result.failure` carrying a {@link CodonError} otherwise
 *
 * @example
 * ```typescript
 * const result = parseCodon(parseRNA('AUG').unwrap());
 * if (result.success) {
 *   result.data.sequence; // 'AUG'
 * }
 * ```
 */
export function parseCodon(rna: RNA): Result<Codon, CodonError> {
  if (rna.sequence.length !== CODON_LENGTH) {
    return failure({
      kind: 'codon/wrong-codon-length',
      length: rna.sequence.length,
      expected: CODON_LENGTH,
    });
  }
  return success(rna as Codon);
}

/**
 * Brands an {@link RNA} as a {@link Codon} without re-checking the length. Reserved for
 * in-tree callers that have already established the length invariant (e.g. via a parser or
 * by slicing a coding sequence in codon-sized steps).
 *
 * @param rna - A pre-validated codon-length RNA
 * @returns The same `rna` with the {@link Codon} brand applied
 *
 * @internal
 */
export function unsafeCodon(rna: RNA): Codon {
  return rna as Codon;
}

/**
 * The canonical start codon (RNA alphabet). Codes for methionine and initiates translation.
 */
export const START_CODON = 'AUG';

/**
 * The three RNA stop codons in the standard genetic code. Stop codons do not code for an
 * amino acid; they signal translation termination.
 */
export type StopCodon = 'UAA' | 'UAG' | 'UGA';

/**
 * The full set of RNA stop codons. Frozen so callers cannot mutate the shared array.
 */
export const STOP_CODONS: readonly StopCodon[] = Object.freeze(['UAA', 'UAG', 'UGA'] as const);

/**
 * Type predicate identifying RNA stop codons.
 *
 * @param codon - A candidate codon string (any length; only 3-character matches return true)
 * @returns `true` if `codon` is one of `UAA`, `UAG`, `UGA`, narrowing to {@link StopCodon}
 *
 * @example
 * ```typescript
 * isStopCodon('UAA'); // true
 * isStopCodon('AUG'); // false
 * ```
 */
export function isStopCodon(codon: string): codon is StopCodon {
  return codon === 'UAA' || codon === 'UAG' || codon === 'UGA';
}

/**
 * Validates that an RNA-coding region aligns to the reading frame.
 *
 * The coding region is the slice of the RNA sequence from `expectedStart` (default `0`) to
 * the end. Its length must be a positive multiple of {@link CODON_LENGTH}. When `expectedStart`
 * is `0`, the validator additionally requires the first three nucleotides to be the
 * {@link START_CODON} (`AUG`).
 *
 * @param sequence - The RNA sequence string to validate
 * @param expectedStart - 0-based position at which the coding region begins (default `0`)
 * @returns A `Result` whose success branch carries `void` (no payload) and whose failure
 * branch carries a structured {@link ReadingFrameError}
 *
 * @example
 * ```typescript
 * const result = validateReadingFrame('AUGAAACCC');
 * if (result.success) {
 *   // frame is valid
 * }
 * ```
 */
export function validateReadingFrame(
  sequence: string,
  expectedStart: number = 0,
): Result<void, ReadingFrameError> {
  const codingLength = sequence.length - expectedStart;
  if (codingLength % CODON_LENGTH !== 0) {
    return failure({
      kind: 'reading-frame/frame-misaligned',
      codingLength,
      codonLength: CODON_LENGTH,
    });
  }

  if (expectedStart === 0 && sequence.length >= CODON_LENGTH) {
    const startCodon = sequence.substring(0, CODON_LENGTH);
    if (startCodon !== START_CODON) {
      return failure({
        kind: 'reading-frame/missing-start-codon',
        found: startCodon,
        position: 0,
      });
    }
  }

  return success(undefined);
}
