import { NucleicAcidImpl } from './internal-nucleic-acid-impl.js';

const DNA_COMPLEMENT_MAP: Readonly<Record<string, string>> = Object.freeze({
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
});

/**
 * A double-helix-strand DNA sequence over the alphabet `{A, C, G, T}`.
 *
 * Instances are immutable: the `sequence` field is `readonly` and every transformation
 * (`getSubsequence`, `getComplement`, `getReverseComplement`) returns a new `DNA`. All the
 * methods (substring / complement / containment / equality) come from the shared
 * {@link NucleicAcidImpl} base; `DNA` only contributes the alphabet-specific complement table.
 *
 * Public callers construct instances via {@link parseDNA}; the constructor is module-private
 * and is not part of the package's public surface.
 */
export class DNA extends NucleicAcidImpl<DNA> {
  /**
   * Constructs a `DNA`. Module-private; public callers must go through {@link parseDNA}.
   *
   * @param sequence - A pre-validated, normalized (upper-case) DNA sequence
   *
   * @internal
   */
  constructor(sequence: string) {
    super(sequence, DNA_COMPLEMENT_MAP);
  }

  /**
   * Builds a new `DNA` over a pre-validated sequence. Implements the base class's abstract
   * factory so Self-returning methods (`getSubsequence`, `getComplement`,
   * `getReverseComplement`) produce a `DNA` without re-running validation.
   *
   * @param sequence - Pre-validated, normalized (upper-case) DNA sequence
   * @returns A new `DNA` over the sequence
   *
   * @internal
   */
  protected clone(sequence: string): DNA {
    return new DNA(sequence);
  }
}

/**
 * Constructs a {@link DNA} without re-validating the input. Reserved for in-tree callers
 * that already know the input is well-formed (e.g. after slicing a validated DNA, after
 * computing a complement). Package consumers must use {@link parseDNA} instead.
 *
 * @param sequence - A pre-validated, normalized (upper-case) DNA sequence
 * @returns A new `DNA` wrapping the sequence with no validation
 *
 * @internal
 */
export function unsafeDNA(sequence: string): DNA {
  return new DNA(sequence);
}
