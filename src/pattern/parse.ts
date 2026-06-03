import { Result, success, failure } from '../result/index.js';
import { isIUPACSymbol } from './iupac-symbols.js';
import type { PatternError } from './errors.js';
import {
  NucleotidePattern,
  compilePatternRegexSource,
  unsafeNucleotidePattern,
} from './NucleotidePattern.js';
import {
  NucleotidePatternSymbol,
  unsafeNucleotidePatternSymbol,
} from './NucleotidePatternSymbol.js';

/**
 * Parses an untrusted IUPAC pattern string into a {@link NucleotidePattern}.
 *
 * The success branch carries a compiled `NucleotidePattern`; the failure branch carries a
 * structured {@link PatternError} naming the specific failure mode (`empty-pattern`,
 * `invalid-iupac-character` with the offending character and index, or
 * `invalid-regex-construction` for patterns whose regex form is malformed).
 *
 * @param input - Candidate pattern string
 * @returns `Result` whose success branch carries a `NucleotidePattern` and whose failure
 * branch carries a `PatternError`
 *
 * @example
 * ```typescript
 * const result = parseNucleotidePattern('TATAWAR');
 * if (result.success) {
 *   result.data.matches(parseDNA('TATAAAT').unwrap());
 * }
 * ```
 */
export function parseNucleotidePattern(input: string): Result<NucleotidePattern, PatternError> {
  const outcome = compilePatternRegexSource(input);
  if (!outcome.success) {
    return failure(outcome.error);
  }
  let basicRegex: RegExp;
  let globalRegex: RegExp;
  try {
    basicRegex = new RegExp(outcome.data);
    globalRegex = new RegExp(outcome.data, 'g');
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return failure({ kind: 'pattern/invalid-regex-construction', pattern: input, cause: message });
  }
  return success(unsafeNucleotidePattern(input, basicRegex, globalRegex));
}

/**
 * Parses an untrusted IUPAC symbol into a {@link NucleotidePatternSymbol}.
 *
 * The success branch carries the validated symbol; the failure branch carries a
 * {@link PatternError} naming the failure mode (`empty-symbol` for empty input or
 * `invalid-iupac-symbol` for any character that is not one of the IUPAC nucleotide symbols).
 *
 * @param input - Candidate IUPAC symbol (single character, case-insensitive)
 * @returns `Result` whose success branch carries a `NucleotidePatternSymbol` and whose failure
 * branch carries a `PatternError`
 *
 * @example
 * ```typescript
 * const result = parseNucleotidePatternSymbol('r');
 * if (result.success) {
 *   result.data.matchingBases; // ['G', 'A']
 * }
 * ```
 */
export function parseNucleotidePatternSymbol(
  input: string,
): Result<NucleotidePatternSymbol, PatternError> {
  if (input === '') {
    return failure({ kind: 'pattern/empty-symbol' });
  }
  const upper = input.toUpperCase();
  if (!isIUPACSymbol(upper)) {
    return failure({ kind: 'pattern/invalid-iupac-symbol', symbol: input });
  }
  return success(unsafeNucleotidePatternSymbol(upper));
}

/**
 * Compiles a known-valid IUPAC pattern literal into a {@link NucleotidePattern}. Intended for
 * module-load constants where the input is a hard-coded string and a malformed literal is a
 * programmer error rather than a runtime failure. Throws if `pattern` fails to parse.
 *
 * Use {@link parseNucleotidePattern} for untrusted input that needs structured failure
 * handling.
 *
 * @param pattern - A hard-coded IUPAC pattern string
 * @returns The compiled `NucleotidePattern`
 * @throws Error when `pattern` is not a valid IUPAC pattern (the parser's failure rendered as
 * an Error)
 */
export function compileLiteralPattern(pattern: string): NucleotidePattern {
  return parseNucleotidePattern(pattern).unwrap();
}
