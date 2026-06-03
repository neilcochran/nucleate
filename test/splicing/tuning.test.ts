import { DEFAULT_MAX_INTRON_SEARCH } from '../../src/splicing';
import { MAX_INTRON_SIZE } from '../../src/gene';

/**
 * Validates splice-site search tunables. These knobs adjust how far `findPotentialSpliceSites`
 * scans without changing the underlying biology; the immutable splice constants live in
 * `biology.test.ts`.
 */
describe('Splicing tuning parameters', () => {
  test('DEFAULT_MAX_INTRON_SEARCH is practical for splice-site detection', () => {
    expect(DEFAULT_MAX_INTRON_SEARCH).toBe(10000);
    expect(DEFAULT_MAX_INTRON_SEARCH).toBeLessThan(MAX_INTRON_SIZE);
  });
});
