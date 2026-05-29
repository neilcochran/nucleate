import { describeVariantValidationError, type VariantValidationError } from '../../src/variants';

describe('describeVariantValidationError', () => {
  const cases: { error: VariantValidationError; expected: RegExp }[] = [
    {
      error: { kind: 'variant-no-included-exons', variantName: 'v' },
      expected: /Variant 'v'.*at least one exon/,
    },
    {
      error: { kind: 'variant-duplicate-exon-indices', variantName: 'v', duplicateIndices: [1, 2] },
      expected: /Variant 'v'.*duplicate exon indices.*1, 2/,
    },
    {
      error: {
        kind: 'variant-invalid-exon-index',
        variantName: 'bad',
        exonIndex: 5,
        totalExons: 3,
      },
      expected: /Variant 'bad'.*invalid exon index 5.*3 exons/,
    },
    {
      error: { kind: 'variant-skips-first-exon', variantName: 'v' },
      expected: /Variant 'v'.*skips the first exon/,
    },
    {
      error: { kind: 'variant-skips-last-exon', variantName: 'v' },
      expected: /Variant 'v'.*skips the last exon/,
    },
    {
      error: {
        kind: 'variant-below-minimum-exons',
        variantName: 'v',
        included: 1,
        minimum: 3,
      },
      expected: /Variant 'v'.*1 exons.*minimum required is 3/,
    },
    {
      error: { kind: 'variant-not-in-frame', variantName: 'v', length: 13 },
      expected: /Variant 'v'.*reading frame.*13.*divisible by 3/,
    },
    {
      error: { kind: 'variant-missing-start-codon', variantName: 'v', found: 'CCC' },
      expected: /Variant 'v'.*start codon AUG.*'CCC'/,
    },
    {
      error: { kind: 'variant-missing-stop-codon', variantName: 'v', found: 'AAA' },
      expected: /Variant 'v'.*stop codon.*'AAA'/,
    },
  ];

  for (const { error, expected } of cases) {
    test(`renders ${error.kind}`, () => {
      expect(describeVariantValidationError(error)).toMatch(expected);
    });
  }
});
