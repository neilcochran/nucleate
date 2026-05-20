/**
 * Tagged-union errors raised by the pattern-level parsers.
 *
 * One discriminated union (`PatternError`) covers both symbol-level (`parseNucleotidePatternSymbol`)
 * and full-pattern (`parseNucleotidePattern`) failures. Human-readable messages are produced by
 * the {@link describePatternError} renderer rather than carried alongside the structured payload.
 */
import { assertUnreachable } from '../result/index.js';

/**
 * Error variants produced by `parseNucleotidePattern` and `parseNucleotidePatternSymbol`.
 *
 * - `empty-pattern`: the input string was empty when parsing a full pattern.
 * - `empty-symbol`: the input string was empty when parsing a single symbol.
 * - `invalid-iupac-character`: while scanning a full pattern, an alpha character was encountered
 *   that is not one of the IUPAC nucleotide symbols (and is not part of a regex escape sequence).
 * - `invalid-iupac-symbol`: when parsing a single symbol, the input was not one of the IUPAC
 *   nucleotide symbols.
 * - `invalid-regex-construction`: the pattern parsed character-by-character but its compiled
 *   regex form was rejected by `RegExp` (e.g. unbalanced brackets, dangling quantifiers).
 */
export type PatternError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'empty-pattern';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'empty-symbol';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-iupac-character';
      /** The offending character. */
      readonly character: string;
      /** Index of the offending character within the input pattern (0-based). */
      readonly index: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-iupac-symbol';
      /** The candidate symbol string the caller supplied. */
      readonly symbol: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-regex-construction';
      /** The pattern string that produced an invalid regex. */
      readonly pattern: string;
      /** Underlying error message from `RegExp`'s constructor. */
      readonly cause: string;
    };

/** Renders a {@link PatternError} as a human-readable message. */
export function describePatternError(error: PatternError): string {
  switch (error.kind) {
    case 'empty-pattern':
      return 'Nucleotide pattern cannot be empty';
    case 'empty-symbol':
      return 'Nucleotide pattern symbol cannot be empty';
    case 'invalid-iupac-character':
      return `Invalid nucleotide pattern character '${error.character}' at index ${error.index}`;
    case 'invalid-iupac-symbol':
      return `Invalid IUPAC nucleotide symbol: '${error.symbol}'`;
    case 'invalid-regex-construction':
      return `Invalid nucleotide pattern '${error.pattern}': ${error.cause}`;
    default:
      return assertUnreachable(error);
  }
}
