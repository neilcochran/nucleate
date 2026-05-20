import { Result, success, failure, isFailure } from '../result/index.js';
import { parseRNA } from '../sequence/index.js';
import type { RNA } from '../sequence/index.js';
import { unsafeRNA } from '../sequence/RNA.js';
import { MIN_RNA_PRIMER_LENGTH, MAX_RNA_PRIMER_LENGTH } from './biological-constants.js';
import type { RNAPrimerError } from './errors.js';

/**
 * Module-private construction key gating the {@link RNAPrimer} constructor. Not re-exported
 * from the package barrel; only files inside `src/replication/` reach it via
 * {@link unsafeRNAPrimer}.
 *
 * @internal
 */
const UNSAFE_PRIMER_KEY: unique symbol = Symbol('unsafe-rna-primer');

/**
 * An immutable RNA primer used to initiate DNA synthesis on an Okazaki fragment.
 *
 * Primers are short RNA sequences (3-10 nucleotides) synthesized by primase that supply the
 * 3'-OH group DNA polymerase needs to begin extension.
 *
 * Instances are immutable. Construction goes through {@link parseRNAPrimer}, which validates
 * the sequence against the RNA alphabet and the biological length range. There is no public
 * mutator for the "removed" lifecycle state - the fragment-level event log narrates removal,
 * and primer excision is represented at the fragment level by the `'primer-removed'` /
 * `'ligated'` phase discriminators.
 */
export class RNAPrimer {
  /** The validated RNA sequence of this primer. */
  public readonly sequence: RNA;

  /**
   * 0-based position on the lagging-strand template where this primer is annealed (the
   * primer extends from `position` toward higher positions).
   */
  public readonly position: number;

  /**
   * Constructs an {@link RNAPrimer} from already-validated inputs.
   *
   * Public callers must use {@link parseRNAPrimer} instead; the constructor is gated by a
   * module-private sentinel.
   *
   * @param sequence - Validated RNA sequence (3-10 nucleotides)
   * @param position - 0-based template position
   * @param trustedKey - Module-private construction key.
   *
   * @throws Error if `trustedKey` is missing or does not match the sentinel
   */
  constructor(sequence: RNA, position: number, trustedKey: typeof UNSAFE_PRIMER_KEY) {
    if (trustedKey !== UNSAFE_PRIMER_KEY) {
      throw new Error('RNAPrimer constructor is module-private; use parseRNAPrimer');
    }
    this.sequence = sequence;
    this.position = position;
  }

  /**
   * Returns the length of this primer in nucleotides.
   *
   * @returns Length in nucleotides
   */
  length(): number {
    return this.sequence.sequence.length;
  }
}

/**
 * Parses a candidate RNA sequence string and template position into a validated
 * {@link RNAPrimer}.
 *
 * The sequence must be a valid RNA string and its length must fall within the biological
 * 3-10 nucleotide range. The position must be a non-negative integer.
 *
 * @param sequence - Candidate RNA sequence string
 * @param position - 0-based template position where the primer is annealed
 * @returns `Result.success` containing the `RNAPrimer`, or `Result.failure` carrying an
 * {@link RNAPrimerError}
 *
 * @example
 * ```typescript
 * const result = parseRNAPrimer('AUCG', 42);
 * if (result.success) {
 *   result.data.sequence.sequence; // 'AUCG'
 *   result.data.position;          // 42
 * }
 * ```
 */
export function parseRNAPrimer(
  sequence: string,
  position: number,
): Result<RNAPrimer, RNAPrimerError> {
  if (!Number.isInteger(position) || position < 0) {
    return failure({ kind: 'invalid-position', position });
  }
  const rnaResult = parseRNA(sequence);
  if (isFailure(rnaResult)) {
    return failure({ kind: 'invalid-sequence', cause: rnaResult.error });
  }
  const rna = rnaResult.data;
  if (rna.sequence.length < MIN_RNA_PRIMER_LENGTH || rna.sequence.length > MAX_RNA_PRIMER_LENGTH) {
    return failure({
      kind: 'invalid-length',
      length: rna.sequence.length,
      min: MIN_RNA_PRIMER_LENGTH,
      max: MAX_RNA_PRIMER_LENGTH,
    });
  }
  return success(unsafeRNAPrimer(rna, position));
}

/**
 * Constructs an {@link RNAPrimer} without re-validating the inputs. Reserved for
 * `replication/`-internal callers (the `replicate` pipeline) that already know the inputs
 * are well-formed.
 *
 * @internal
 *
 * @param sequence - Validated RNA sequence
 * @param position - Validated non-negative position
 * @returns A new `RNAPrimer`
 */
export function unsafeRNAPrimer(sequence: RNA, position: number): RNAPrimer {
  return new RNAPrimer(sequence, position, UNSAFE_PRIMER_KEY);
}

/**
 * Constructs an {@link RNAPrimer} from a trusted string sequence, skipping RNA-alphabet
 * parsing. The caller is asserting `sequence` is already a valid RNA string of the
 * biologically-acceptable length. Reserved for `replication/`-internal callers.
 *
 * @internal
 *
 * @param sequence - Trusted RNA sequence string (3-10 characters over `{A, C, G, U}`)
 * @param position - Non-negative template position
 * @returns A new `RNAPrimer`
 */
export function unsafeRNAPrimerFromString(sequence: string, position: number): RNAPrimer {
  return unsafeRNAPrimer(unsafeRNA(sequence), position);
}
