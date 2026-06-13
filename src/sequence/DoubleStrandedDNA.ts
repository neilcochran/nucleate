import { DNA } from './DNA.js';

/**
 * An immutable double-stranded DNA duplex modeled as a pair of complementary {@link DNA}
 * strands.
 *
 * Both strands are stored 5'-to-3' (the conventional reading direction for single-stranded
 * DNA). When laid out as a physical duplex they are antiparallel: the {@link reverse} strand,
 * read 5'-to-3', is the reverse complement of {@link forward} read 5'-to-3'.
 *
 * Instances are immutable. Construction goes through {@link parseDoubleStrandedDNA} (which
 * validates that the supplied pair of strands actually form a duplex) or
 * {@link doubleStrandedDNA} (which synthesizes the reverse strand from a single forward
 * strand). The constructor is module-private and is not part of the package surface.
 */
export class DoubleStrandedDNA {
  /** The forward strand, oriented 5'-to-3'. */
  public readonly forward: DNA;

  /**
   * The reverse strand, oriented 5'-to-3'. Equal to `forward.getReverseComplement()`; the two
   * strands are antiparallel when laid out as a physical duplex.
   */
  public readonly reverse: DNA;

  /**
   * Constructs a {@link DoubleStrandedDNA} from a pair of already-validated complementary
   * strands.
   *
   * Public callers must use {@link parseDoubleStrandedDNA} or {@link doubleStrandedDNA}
   * instead; the constructor is module-private so that the duplex invariant ("reverse equals
   * forward.getReverseComplement()") cannot be sidestepped from outside the sequence module.
   *
   * @param forward - Validated forward strand (5'-to-3')
   * @param reverse - Validated reverse strand (5'-to-3'); must equal
   * `forward.getReverseComplement()`
   */
  constructor(forward: DNA, reverse: DNA) {
    this.forward = forward;
    this.reverse = reverse;
  }

  /**
   * Returns the length of the duplex in base pairs. Both strands always have the same length.
   *
   * @returns Base-pair count
   */
  length(): number {
    return this.forward.sequence.length;
  }

  /**
   * Reports structural equality with another {@link DoubleStrandedDNA}. Two duplexes are
   * equal when their forward and reverse strand sequences both match.
   *
   * @param other - The duplex to compare against
   * @returns `true` if the two duplexes carry identical strand sequences
   */
  equals(other: DoubleStrandedDNA): boolean {
    return (
      this.forward.sequence === other.forward.sequence &&
      this.reverse.sequence === other.reverse.sequence
    );
  }
}

/**
 * Constructs a {@link DoubleStrandedDNA} without re-validating the pair. Reserved for
 * in-tree callers that already know the two strands form a duplex. Package consumers must
 * use {@link parseDoubleStrandedDNA} or `doubleStrandedDNA` instead.
 *
 * @param forward - Pre-validated forward strand
 * @param reverse - Pre-validated reverse strand, complementary to `forward`
 * @returns A new `DoubleStrandedDNA` with no validation
 *
 * @internal
 */
export function unsafeDoubleStrandedDNA(forward: DNA, reverse: DNA): DoubleStrandedDNA {
  return new DoubleStrandedDNA(forward, reverse);
}
