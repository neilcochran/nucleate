/**
 * Tagged-union errors raised by the sequence-level parsers and helpers.
 *
 * Each domain returns its own discriminated union so callers can branch on `kind` and have
 * TypeScript narrow the surrounding fields. The `kind` discriminators are namespaced by domain
 * (`dna/`, `rna/`, `codon/`, ...) so they stay globally unique across the package. Human-readable
 * messages are produced centrally by `describeError` (see `src/describe.ts`).
 */

/**
 * Error variants produced when parsing a DNA sequence string.
 *
 * Returned in the failure branch of `Result<DNA, DNAError>` from `parseDNA`.
 */
export type DNAError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'dna/empty-sequence';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'dna/invalid-characters';
      /** Distinct invalid characters discovered in the input, preserving discovery order. */
      readonly chars: readonly string[];
      /** Index of the first invalid character (0-based, in the original input). */
      readonly firstAt: number;
    };

/**
 * Error variants produced when parsing an RNA sequence string.
 *
 * Returned in the failure branch of `Result<RNA, RNAError>` from `parseRNA`.
 */
export type RNAError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'rna/empty-sequence';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'rna/invalid-characters';
      /** Distinct invalid characters discovered in the input, preserving discovery order. */
      readonly chars: readonly string[];
      /** Index of the first invalid character (0-based, in the original input). */
      readonly firstAt: number;
    };

/**
 * Error variants raised by `parseCodon` when an {@link RNA} is not codon-length.
 *
 * Returned in the failure branch of `Result<Codon, CodonError>`.
 */
export type CodonError = {
  /** Discriminator naming the failure mode. */
  readonly kind: 'codon/wrong-codon-length';
  /** The length of the RNA the caller supplied. */
  readonly length: number;
  /** The required length (always `CODON_LENGTH` = 3 for the standard genetic code). */
  readonly expected: number;
};

/**
 * Error variants raised by `validateReadingFrame`.
 *
 * The `kind: 'reading-frame/frame-misaligned'` variant fires when the coding-region length is not
 * a multiple of `CODON_LENGTH`. The `kind: 'reading-frame/missing-start-codon'` variant fires when
 * the caller asked the validator to verify that position 0 begins with `AUG` and it does not.
 */
export type ReadingFrameError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'reading-frame/frame-misaligned';
      /** Length (in nucleotides) of the coding region as provided. */
      readonly codingLength: number;
      /** Codon length the coding region must be a multiple of (always 3 for the standard code). */
      readonly codonLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'reading-frame/missing-start-codon';
      /** Codon string actually found at the candidate start position. */
      readonly found: string;
      /** Position (0-based) at which the start codon was expected. */
      readonly position: number;
    };

/**
 * Error variants raised by `parseDoubleStrandedDNA` when validating that two `DNA` strands form a
 * valid double-stranded duplex.
 *
 * Returned in the failure branch of `Result<DoubleStrandedDNA, DoubleStrandedError>`.
 */
export type DoubleStrandedError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'double-stranded/length-mismatch';
      /** Length of the forward strand (nucleotides). */
      readonly forwardLength: number;
      /** Length of the reverse strand (nucleotides). */
      readonly reverseLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'double-stranded/not-complementary';
      /** 0-based index of the first mismatched position on the forward strand. */
      readonly firstMismatchAt: number;
      /** Base expected on the reverse strand at the mismatched position. */
      readonly expected: string;
      /** Base actually found on the reverse strand at the mismatched position. */
      readonly actual: string;
    };
