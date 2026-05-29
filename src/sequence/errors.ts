/**
 * Tagged-union errors raised by the sequence-level parsers and helpers.
 *
 * Each domain returns its own discriminated union so callers can branch on `kind` and have
 * TypeScript narrow the surrounding fields. Human-readable messages are produced at the
 * rendering layer (see {@link describeDNAError} / {@link describeRNAError} /
 * {@link describeReadingFrameError}) rather than carried alongside the structured payload.
 */
import { makeDescriber } from '../result/index.js';

/**
 * Error variants produced when parsing a DNA sequence string.
 *
 * Returned in the failure branch of `Result<DNA, DNAError>` from `parseDNA`.
 */
export type DNAError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'empty-sequence';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-characters';
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
      readonly kind: 'empty-sequence';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-characters';
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
  readonly kind: 'wrong-codon-length';
  /** The length of the RNA the caller supplied. */
  readonly length: number;
  /** The required length (always `CODON_LENGTH` = 3 for the standard genetic code). */
  readonly expected: number;
};

/** Renders a {@link CodonError} as a human-readable message. */
export const describeCodonError = makeDescriber<CodonError>({
  'wrong-codon-length': e => `Codon must be ${e.expected} nucleotides; received ${e.length}`,
});

/**
 * Error variants raised by `validateReadingFrame`.
 *
 * The `kind: 'frame-misaligned'` variant fires when the coding-region length is not a
 * multiple of `CODON_LENGTH`. The `kind: 'missing-start-codon'` variant fires when the
 * caller asked the validator to verify that position 0 begins with `AUG` and it does not.
 */
export type ReadingFrameError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'frame-misaligned';
      /** Length (in nucleotides) of the coding region as provided. */
      readonly codingLength: number;
      /** Codon length the coding region must be a multiple of (always 3 for the standard code). */
      readonly codonLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'missing-start-codon';
      /** Codon string actually found at the candidate start position. */
      readonly found: string;
      /** Position (0-based) at which the start codon was expected. */
      readonly position: number;
    };

/** Renders a {@link DNAError} as a human-readable message. */
export const describeDNAError = makeDescriber<DNAError>({
  'empty-sequence': () => 'DNA sequence cannot be empty',
  'invalid-characters': e =>
    `Invalid DNA sequence: contains invalid characters ${e.chars.join(', ')} (first at index ${e.firstAt})`,
});

/** Renders an {@link RNAError} as a human-readable message. */
export const describeRNAError = makeDescriber<RNAError>({
  'empty-sequence': () => 'RNA sequence cannot be empty',
  'invalid-characters': e =>
    `Invalid RNA sequence: contains invalid characters ${e.chars.join(', ')} (first at index ${e.firstAt})`,
});

/** Renders a {@link ReadingFrameError} as a human-readable message. */
export const describeReadingFrameError = makeDescriber<ReadingFrameError>({
  'frame-misaligned': e =>
    `Reading frame error: coding sequence length ${e.codingLength} is not divisible by ${e.codonLength}`,
  'missing-start-codon': e =>
    `Expected start codon AUG at position ${e.position}, found ${e.found}`,
});

/**
 * Error variants raised by `parseDoubleStrandedDNA` when validating that two `DNA` strands
 * form a valid double-stranded duplex.
 *
 * Returned in the failure branch of `Result<DoubleStrandedDNA, DoubleStrandedError>`.
 */
export type DoubleStrandedError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'length-mismatch';
      /** Length of the forward strand (nucleotides). */
      readonly forwardLength: number;
      /** Length of the reverse strand (nucleotides). */
      readonly reverseLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'not-complementary';
      /** 0-based index of the first mismatched position on the forward strand. */
      readonly firstMismatchAt: number;
      /** Base expected on the reverse strand at the mismatched position. */
      readonly expected: string;
      /** Base actually found on the reverse strand at the mismatched position. */
      readonly actual: string;
    };

/** Renders a {@link DoubleStrandedError} as a human-readable message. */
export const describeDoubleStrandedError = makeDescriber<DoubleStrandedError>({
  'length-mismatch': e =>
    `Double-stranded DNA requires equal-length strands; forward is ${e.forwardLength} nt, reverse is ${e.reverseLength} nt`,
  'not-complementary': e =>
    `Strands are not complementary: at forward index ${e.firstMismatchAt} the reverse strand has '${e.actual}' but expected '${e.expected}'`,
});
