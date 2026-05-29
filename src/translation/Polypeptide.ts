import type { MRNA } from '../modifications/index.js';
import type { AminoAcid } from './AminoAcid.js';

/**
 * A polypeptide: the ordered amino-acid product of translating an mRNA's coding sequence.
 *
 * Composition over inheritance: a `Polypeptide` *has* an mRNA and an amino-acid sequence; it
 * is not a kind of sequence. Translation terminates at the first in-frame stop codon, so the
 * stored amino-acid sequence may be shorter than `mRNA.codingSequence.length / 3`.
 *
 * Public construction goes through the `translate` pipeline; the constructor is module-private
 * and is not part of the package's public surface.
 */
export class Polypeptide {
  /** The mRNA whose coding sequence produced this polypeptide. */
  public readonly mRNA: MRNA;

  /** Ordered amino acids, terminating at (but not including) the first in-frame stop codon. */
  public readonly aminoAcids: readonly AminoAcid[];

  /**
   * Constructs a `Polypeptide`. Module-private; public callers must go through `translate`.
   *
   * @param mRNA - The mRNA whose coding sequence produced this polypeptide
   * @param aminoAcids - The validated, in-order amino-acid sequence
   *
   * @internal
   */
  constructor(mRNA: MRNA, aminoAcids: readonly AminoAcid[]) {
    this.mRNA = mRNA;
    this.aminoAcids = aminoAcids;
  }

  /**
   * Returns the polypeptide as a single-letter-code string (e.g. `'MKGK'`).
   *
   * @returns Concatenated single-letter amino-acid codes
   */
  getSequence(): string {
    let result = '';
    for (const aa of this.aminoAcids) {
      result += aa.data.singleLetterCode;
    }
    return result;
  }

  /**
   * Reports whether this polypeptide contains the given amino-acid subsequence.
   *
   * @param subsequence - The polypeptide subsequence to search for
   * @returns `true` if the subsequence appears anywhere in the single-letter sequence
   */
  contains(subsequence: Polypeptide): boolean {
    return this.getSequence().includes(subsequence.getSequence());
  }

  /**
   * Reports whether this polypeptide starts with the given amino-acid prefix.
   *
   * @param prefix - The polypeptide prefix to test
   * @returns `true` if the single-letter sequence starts with `prefix`
   */
  startsWith(prefix: Polypeptide): boolean {
    return this.getSequence().startsWith(prefix.getSequence());
  }

  /**
   * Reports whether this polypeptide ends with the given amino-acid suffix.
   *
   * @param suffix - The polypeptide suffix to test
   * @returns `true` if the single-letter sequence ends with `suffix`
   */
  endsWith(suffix: Polypeptide): boolean {
    return this.getSequence().endsWith(suffix.getSequence());
  }

  /**
   * Returns the first index of the given amino-acid subsequence, or `-1` if the subsequence
   * does not appear.
   *
   * @param subsequence - The polypeptide subsequence to search for
   * @param startPosition - 0-based position to start searching from (default `0`)
   * @returns Index of the first match, or `-1`
   */
  indexOf(subsequence: Polypeptide, startPosition: number = 0): number {
    return this.getSequence().indexOf(subsequence.getSequence(), startPosition);
  }
}

/**
 * Constructs a {@link Polypeptide} without re-running validation. Provides symmetry with the
 * other gated types' unsafe factories.
 *
 * @param mRNA - The mRNA whose coding sequence produced this polypeptide
 * @param aminoAcids - The validated, in-order amino-acid sequence
 * @returns A new `Polypeptide`
 *
 * @internal
 */
export function unsafePolypeptide(mRNA: MRNA, aminoAcids: readonly AminoAcid[]): Polypeptide {
  return new Polypeptide(mRNA, aminoAcids);
}
