import { describeError } from '../../src';
import type { PatternError } from '../../src/pattern';

describe('describePatternError', () => {
  test('renders empty-pattern', () => {
    const error: PatternError = { kind: 'pattern/empty-pattern' };
    expect(describeError(error)).toBe('Nucleotide pattern cannot be empty');
  });

  test('renders empty-symbol', () => {
    const error: PatternError = { kind: 'pattern/empty-symbol' };
    expect(describeError(error)).toBe('Nucleotide pattern symbol cannot be empty');
  });

  test('renders invalid-iupac-character with the offending character and index', () => {
    const error: PatternError = {
      kind: 'pattern/invalid-iupac-character',
      character: 'X',
      index: 3,
    };
    const message = describeError(error);
    expect(message).toContain("'X'");
    expect(message).toContain('3');
  });

  test('renders invalid-iupac-symbol naming the symbol', () => {
    const error: PatternError = { kind: 'pattern/invalid-iupac-symbol', symbol: 'Z' };
    expect(describeError(error)).toContain("'Z'");
  });

  test('renders invalid-regex-construction including the underlying cause', () => {
    const error: PatternError = {
      kind: 'pattern/invalid-regex-construction',
      pattern: 'A{',
      cause: 'Invalid quantifier',
    };
    const message = describeError(error);
    expect(message).toContain('A{');
    expect(message).toContain('Invalid quantifier');
  });
});
