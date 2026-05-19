import type { RNA } from '../sequence/index.js';
import { unsafeRNA } from '../sequence/RNA.js';
import type { MatureMRNACoord } from '../coordinates/index.js';
import { MIN_POLY_A_DETECTION_LENGTH } from '../polyadenylation/biology.js';

/**
 * Module-private construction key gating the {@link MRNA} constructor. Not re-exported from
 * the package barrel; in-tree callers reach it via {@link unsafeMRNA}.
 *
 * @internal
 */
const UNSAFE_MRNA_KEY: unique symbol = Symbol('unsafe-mrna');

/**
 * Mature mRNA: a validated {@link RNA} sequence together with coding-region boundaries, a
 * 5'-cap flag, and the length of the 3' poly-A tail.
 *
 * Composition over inheritance: an `MRNA` *has* an {@link RNA} sequence, it is not a kind of
 * `RNA`. Coordinates are 0-based, half-open `[codingStart, codingEnd)`. The coding sequence is
 * pre-computed at construction time (so getters are cheap and downstream code never has to
 * re-substring), and the poly-A tail is described by its length only (the underlying string
 * is the suffix of {@link sequence}).
 *
 * Public construction goes through `parseMRNA` (for reconstruction from saved data) or
 * `processRNA` (for the pre-mRNA -\> mature mRNA pipeline). The constructor is gated by a
 * module-private sentinel.
 */
export class MRNA {
  /** The validated, full mature-mRNA sequence (cap is metadata; tail bases are included). */
  public readonly sequence: RNA;

  /**
   * 0-based inclusive index where the coding sequence begins, relative to {@link sequence}.
   * Branded as {@link MatureMRNACoord} so it cannot be confused with gene-relative or
   * transcript-relative positions.
   */
  public readonly codingStart: MatureMRNACoord;

  /**
   * 0-based exclusive index where the coding sequence ends, relative to {@link sequence}.
   * Branded as {@link MatureMRNACoord}; see {@link codingStart}.
   */
  public readonly codingEnd: MatureMRNACoord;

  /**
   * The subsequence `[codingStart, codingEnd)` of {@link sequence}, wrapped as a typed
   * {@link RNA}. Computed once at construction time, so downstream consumers (translation,
   * splice-variant analysis) can read it as a plain field. `parseMRNA` enforces
   * `codingStart < codingEnd`, so the coding region is guaranteed non-empty.
   */
  public readonly codingSequence: RNA;

  /** Whether the mRNA carries the 5' methylguanosine cap. */
  public readonly fivePrimeCap: boolean;

  /** Length of the 3' poly-A tail in nucleotides. The tail is the last `n` bases of {@link sequence}. */
  public readonly polyATailLength: number;

  /**
   * Constructs an `MRNA`. Module-private; public callers must go through `parseMRNA` or
   * `processRNA`.
   *
   * @param sequence - The validated RNA sequence backing this mature mRNA
   * @param codingStart - Validated coding-sequence start (0-based inclusive)
   * @param codingEnd - Validated coding-sequence end (0-based exclusive)
   * @param fivePrimeCap - Whether the mRNA carries a 5' cap
   * @param polyATailLength - Length of the 3' poly-A tail (0 means no tail)
   * @param trustedKey - Sentinel proving the caller is `modifications/`-internal
   *
   * @internal
   */
  constructor(
    sequence: RNA,
    codingStart: MatureMRNACoord,
    codingEnd: MatureMRNACoord,
    fivePrimeCap: boolean,
    polyATailLength: number,
    trustedKey: typeof UNSAFE_MRNA_KEY,
  ) {
    if (trustedKey !== UNSAFE_MRNA_KEY) {
      throw new Error('MRNA must be constructed via parseMRNA');
    }
    this.sequence = sequence;
    this.codingStart = codingStart;
    this.codingEnd = codingEnd;
    this.fivePrimeCap = fivePrimeCap;
    this.polyATailLength = polyATailLength;
    this.codingSequence = unsafeRNA(sequence.sequence.substring(codingStart, codingEnd));
  }

  /**
   * Returns the 5' untranslated region: the {@link RNA} subsequence before {@link codingStart}.
   *
   * @returns The 5'-UTR as RNA, or `undefined` when the coding sequence starts at position 0
   * (the mRNA has no 5'-UTR)
   */
  getFivePrimeUTR(): RNA | undefined {
    if (this.codingStart === 0) {
      return undefined;
    }
    return unsafeRNA(this.sequence.sequence.substring(0, this.codingStart));
  }

  /**
   * Returns the 3' untranslated region: the {@link RNA} subsequence between {@link codingEnd}
   * and the start of the poly-A tail.
   *
   * @returns The 3'-UTR as RNA, or `undefined` when the coding sequence ends right before the
   * tail (or at the end of the sequence) - the mRNA has no 3'-UTR
   */
  getThreePrimeUTR(): RNA | undefined {
    const length = this.sequence.sequence.length;
    const tailStart = length - this.polyATailLength;
    if (this.codingEnd >= tailStart) {
      return undefined;
    }
    return unsafeRNA(this.sequence.sequence.substring(this.codingEnd, tailStart));
  }

  /**
   * Reports whether the mRNA carries a 5' methylguanosine cap. Thin accessor over the
   * {@link fivePrimeCap} field, provided for API symmetry with {@link withCap} /
   * {@link isFullyProcessed}.
   *
   * @returns `true` when the mRNA is marked capped
   */
  hasCap(): boolean {
    return this.fivePrimeCap;
  }

  /**
   * Returns a new {@link MRNA} marked as carrying a 5' methylguanosine cap. The sequence is
   * unchanged; the cap is metadata only.
   *
   * @returns A new `MRNA` identical to this one except with `fivePrimeCap` set to `true`;
   * returns `this` when the mRNA is already capped
   */
  withCap(): MRNA {
    if (this.fivePrimeCap) {
      return this;
    }
    return new MRNA(
      this.sequence,
      this.codingStart,
      this.codingEnd,
      true,
      this.polyATailLength,
      UNSAFE_MRNA_KEY,
    );
  }

  /**
   * Returns a new {@link MRNA} with the supplied poly-A tail length recorded as metadata. The
   * sequence is unchanged; callers who need to actually rewrite the sequence with appended
   * `A`'s should compose `add3PrimePolyATail` (sequence-level) with `parseMRNA`.
   *
   * @param tailLength - The poly-A tail length to record (non-negative integer)
   * @returns A new `MRNA` with `polyATailLength` updated; returns `this` when the recorded
   * length already equals `tailLength`
   */
  withPolyATail(tailLength: number): MRNA {
    if (this.polyATailLength === tailLength) {
      return this;
    }
    return new MRNA(
      this.sequence,
      this.codingStart,
      this.codingEnd,
      this.fivePrimeCap,
      tailLength,
      UNSAFE_MRNA_KEY,
    );
  }

  /**
   * Reports whether this mRNA is fully processed: carries a 5' cap and a poly-A tail of at
   * least {@link MIN_POLY_A_DETECTION_LENGTH} nucleotides.
   *
   * @returns `true` when both cap and minimum tail are present
   */
  isFullyProcessed(): boolean {
    return this.fivePrimeCap && this.polyATailLength >= MIN_POLY_A_DETECTION_LENGTH;
  }

  /**
   * Returns a string representation of the mature mRNA.
   *
   * @returns `'MRNA(Nnt, CDS s-e, polyA L[, capped])'`
   */
  toString(): string {
    const capStr = this.fivePrimeCap ? ', capped' : '';
    return `MRNA(${this.sequence.sequence.length}nt, CDS ${this.codingStart}-${this.codingEnd}, polyA ${this.polyATailLength}${capStr})`;
  }
}

/**
 * Constructs an {@link MRNA} without re-running validation.
 *
 * @param sequence - Validated RNA sequence
 * @param codingStart - Validated, branded coding-sequence start (0-based inclusive)
 * @param codingEnd - Validated, branded coding-sequence end (0-based exclusive)
 * @param fivePrimeCap - 5'-cap flag
 * @param polyATailLength - Poly-A tail length in nucleotides
 * @returns A new `MRNA`
 *
 * @internal
 */
export function unsafeMRNA(
  sequence: RNA,
  codingStart: MatureMRNACoord,
  codingEnd: MatureMRNACoord,
  fivePrimeCap: boolean,
  polyATailLength: number,
): MRNA {
  return new MRNA(sequence, codingStart, codingEnd, fivePrimeCap, polyATailLength, UNSAFE_MRNA_KEY);
}
