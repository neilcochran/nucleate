import {
  describeProcessingError,
  describeSpliceVariantSelectionError,
  type ProcessingError,
  type SpliceVariantSelectionError,
} from '../../src/processing';
import { describeMRNAError, type MRNAError } from '../../src/modifications';

describe('describeProcessingError', () => {
  const cases: { error: ProcessingError; expected: RegExp }[] = [
    {
      error: { kind: 'invalid-sequence', cause: { kind: 'empty-sequence' } },
      expected: /Invalid mRNA sequence/,
    },
    {
      error: {
        kind: 'invalid-coding-boundaries',
        codingStart: -1,
        codingEnd: 5,
        sequenceLength: 10,
      },
      expected: /Invalid coding-sequence boundaries.*start=-1.*end=5.*length=10/,
    },
    {
      error: { kind: 'invalid-polya-tail-length', polyATailLength: 50, sequenceLength: 30 },
      expected: /Invalid poly-A tail length 50.*length \(30\)/,
    },
    {
      error: { kind: 'splicing-failed', cause: { kind: 'no-exons' } },
      expected: /Splicing failed.*no exons/i,
    },
    { error: { kind: 'no-start-codon' }, expected: /No start codon/ },
    { error: { kind: 'no-in-frame-stop' }, expected: /No in-frame stop codon/ },
  ];

  for (const { error, expected } of cases) {
    test(`renders ${error.kind}`, () => {
      expect(describeProcessingError(error)).toMatch(expected);
    });
  }

  test('renders splicing-failed wrapping a variant-validation cause', () => {
    const error: ProcessingError = {
      kind: 'splicing-failed',
      cause: { kind: 'variant-missing-start-codon', variantName: 'v', found: 'CCC' },
    };
    expect(describeProcessingError(error)).toMatch(/Splicing failed.*Variant 'v'.*start codon/);
  });

  test('delegates the MRNAError subset to describeMRNAError', () => {
    const mRNAError: MRNAError = { kind: 'invalid-sequence', cause: { kind: 'empty-sequence' } };
    expect(describeProcessingError(mRNAError)).toBe(describeMRNAError(mRNAError));
  });
});

describe('describeSpliceVariantSelectionError', () => {
  const cases: { error: SpliceVariantSelectionError; expected: RegExp }[] = [
    {
      error: { kind: 'no-splicing-profile' },
      expected: /does not have an alternative splicing profile/,
    },
    { error: { kind: 'no-default-variant' }, expected: /does not have a default splice variant/ },
  ];

  for (const { error, expected } of cases) {
    test(`renders ${error.kind}`, () => {
      expect(describeSpliceVariantSelectionError(error)).toMatch(expected);
    });
  }
});
