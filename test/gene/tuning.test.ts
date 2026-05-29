import { DEFAULT_MAX_INTRON_SEARCH, MAX_INTRON_SIZE } from '../../src/gene';

/**
 * Validates gene-structure tunable search parameters. These knobs adjust how far splice-site
 * search routines scan without changing the underlying biology; the immutable size bounds and
 * element positions live in `biology.test.ts`.
 */
describe('Gene tuning parameters', () => {
  test('DEFAULT_MAX_INTRON_SEARCH is practical for splice-site detection', () => {
    expect(DEFAULT_MAX_INTRON_SEARCH).toBe(10000);
    expect(DEFAULT_MAX_INTRON_SEARCH).toBeLessThan(MAX_INTRON_SIZE);
  });
});
