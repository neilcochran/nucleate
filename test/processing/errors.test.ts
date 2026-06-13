import { describeError } from '../../src';
import type { ProcessingError, SpliceVariantSelectionError } from '../../src/processing';
import type { MRNAError } from '../../src/modifications';

describe('describeError (ProcessingError)', () => {
  const cases: { error: ProcessingError; expected: RegExp }[] = [
    {
      error: { kind: 'mrna/invalid-sequence', cause: { kind: 'rna/empty-sequence' } },
      expected: /Invalid mRNA sequence/,
    },
    {
      error: {
        kind: 'mrna/invalid-coding-boundaries',
        codingStart: -1,
        codingEnd: 5,
        sequenceLength: 10,
      },
      expected: /Invalid coding-sequence boundaries.*start=-1.*end=5.*length=10/,
    },
    {
      error: { kind: 'mrna/incomplete-coding-boundaries', codingStart: undefined, codingEnd: 9 },
      expected: /Incomplete coding-sequence boundaries.*start=undefined.*end=9/,
    },
    {
      error: { kind: 'mrna/invalid-polya-tail-length', polyATailLength: 50, sequenceLength: 30 },
      expected: /Invalid poly-A tail length 50.*length \(30\)/,
    },
    {
      error: { kind: 'processing/splicing-failed', cause: { kind: 'splicing/no-exons' } },
      expected: /Splicing failed.*no exons/i,
    },
    { error: { kind: 'processing/no-start-codon' }, expected: /No start codon/ },
    { error: { kind: 'processing/no-in-frame-stop' }, expected: /No in-frame stop codon/ },
  ];

  for (const { error, expected } of cases) {
    test(`renders ${error.kind}`, () => {
      expect(describeError(error)).toMatch(expected);
    });
  }

  test('renders splicing-failed wrapping a variant-validation cause', () => {
    const error: ProcessingError = {
      kind: 'processing/splicing-failed',
      cause: { kind: 'variant/missing-start-codon', variantName: 'v', found: 'CCC' },
    };
    expect(describeError(error)).toMatch(/Splicing failed.*Variant 'v'.*start codon/);
  });

  test('delegates the MRNAError subset to describeError (MRNAError)', () => {
    const mRNAError: MRNAError = {
      kind: 'mrna/invalid-sequence',
      cause: { kind: 'rna/empty-sequence' },
    };
    expect(describeError(mRNAError)).toBe(describeError(mRNAError));
  });
});

describe('describeError (SpliceVariantSelectionError)', () => {
  const cases: { error: SpliceVariantSelectionError; expected: RegExp }[] = [
    {
      error: { kind: 'splice-selection/no-splicing-profile' },
      expected: /does not have an alternative splicing profile/,
    },
    {
      error: { kind: 'splice-selection/no-default-variant' },
      expected: /does not have a default splice variant/,
    },
  ];

  for (const { error, expected } of cases) {
    test(`renders ${error.kind}`, () => {
      expect(describeError(error)).toMatch(expected);
    });
  }
});
