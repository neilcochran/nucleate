import { describeMRNAError, type MRNAError } from '../../src/modifications';

describe('describeMRNAError', () => {
  const cases: { error: MRNAError; expected: RegExp }[] = [
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
  ];

  for (const { error, expected } of cases) {
    test(`renders ${error.kind}`, () => {
      expect(describeMRNAError(error)).toMatch(expected);
    });
  }
});
