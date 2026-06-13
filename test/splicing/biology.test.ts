import { MIN_INTRON_LENGTH_FOR_SPLICING } from '../../src/splicing';
import { MIN_INTRON_SIZE } from '../../src/gene';

/**
 * Validates splicing biological constants against known scientific literature.
 *
 * References:
 * - Sheth et al. (2006) Science, "Comprehensive splice-site analysis using comparative genomics"
 */
describe('Splicing biology constants', () => {
  test('MIN_INTRON_LENGTH_FOR_SPLICING permits GT-AG recognition', () => {
    expect(MIN_INTRON_LENGTH_FOR_SPLICING).toBe(4);
    expect(MIN_INTRON_LENGTH_FOR_SPLICING).toBeLessThanOrEqual(MIN_INTRON_SIZE);
  });
});
