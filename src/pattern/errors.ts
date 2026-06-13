/**
 * Tagged-union errors raised by the pattern-level parsers.
 *
 * One discriminated union (`PatternError`) covers both symbol-level
 * (`parseNucleotidePatternSymbol`) and full-pattern (`parseNucleotidePattern`) failures. The
 * `kind` discriminators are namespaced under `pattern/`. Human-readable messages are produced
 * centrally by `describeError` (see `src/describe.ts`).
 */

/**
 * Error variants produced by `parseNucleotidePattern` and `parseNucleotidePatternSymbol`.
 *
 * - `pattern/empty-pattern`: the input string was empty when parsing a full pattern.
 * - `pattern/empty-symbol`: the input string was empty when parsing a single symbol.
 * - `pattern/invalid-iupac-character`: while scanning a full pattern, an alpha character was
 *   encountered that is not one of the IUPAC nucleotide symbols (and is not part of a regex
 *   escape sequence).
 * - `pattern/invalid-iupac-symbol`: when parsing a single symbol, the input was not one of the
 *   IUPAC nucleotide symbols.
 * - `pattern/invalid-regex-construction`: the pattern parsed character-by-character but its
 *   compiled regex form was rejected by `RegExp` (e.g. unbalanced brackets, dangling quantifiers).
 */
export type PatternError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'pattern/empty-pattern';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'pattern/empty-symbol';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'pattern/invalid-iupac-character';
      /** The offending character. */
      readonly character: string;
      /** Index of the offending character within the input pattern (0-based). */
      readonly index: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'pattern/invalid-iupac-symbol';
      /** The candidate symbol string the caller supplied. */
      readonly symbol: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'pattern/invalid-regex-construction';
      /** The pattern string that produced an invalid regex. */
      readonly pattern: string;
      /** Underlying error message from `RegExp`'s constructor. */
      readonly cause: string;
    };
