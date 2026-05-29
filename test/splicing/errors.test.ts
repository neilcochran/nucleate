import { describeSplicingError, type SplicingError } from '../../src/splicing';

describe('describeSplicingError', () => {
  const cases: { error: SplicingError; expected: RegExp }[] = [
    { error: { kind: 'no-exons' }, expected: /no exons/i },
    {
      error: {
        kind: 'exon-out-of-bounds',
        exonIndex: 1,
        start: 10,
        end: 20,
        sequenceLength: 15,
      },
      expected: /Exon 1.*10-20.*length 15/,
    },
    {
      error: { kind: 'invalid-donor-site', intronIndex: 0, position: 3, found: 'AU' },
      expected: /Invalid 5' splice site.*position 3.*GU.*AU/,
    },
    {
      error: { kind: 'invalid-acceptor-site', intronIndex: 0, position: 8, found: 'UU' },
      expected: /Invalid 3' splice site.*position 8.*AG.*UU/,
    },
    {
      error: { kind: 'intron-too-short', intronIndex: 0, length: 2, min: 4 },
      expected: /Intron 0.*too short.*2 bp.*minimum 4/,
    },
  ];

  for (const { error, expected } of cases) {
    test(`renders ${error.kind}`, () => {
      expect(describeSplicingError(error)).toMatch(expected);
    });
  }
});
