import { describeError } from '../../src';
import type { MRNAError } from '../../src/modifications';

describe('describeError (MRNAError)', () => {
  const cases: { error: MRNAError; expected: RegExp }[] = [
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
      error: { kind: 'mrna/incomplete-coding-boundaries', codingStart: 0, codingEnd: undefined },
      expected: /Incomplete coding-sequence boundaries.*start=0.*end=undefined/,
    },
    {
      error: { kind: 'mrna/invalid-polya-tail-length', polyATailLength: 50, sequenceLength: 30 },
      expected: /Invalid poly-A tail length 50.*length \(30\)/,
    },
  ];

  for (const { error, expected } of cases) {
    test(`renders ${error.kind}`, () => {
      expect(describeError(error)).toMatch(expected);
    });
  }
});
