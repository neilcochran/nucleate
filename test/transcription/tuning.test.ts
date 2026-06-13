import {
  MAX_PROMOTER_SEARCH_DISTANCE,
  DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE,
  DEFAULT_DOWNSTREAM_SEARCH_DISTANCE,
  TSS_PROXIMITY_THRESHOLD,
  DEFAULT_MIN_PROMOTER_STRENGTH,
} from '../../src/transcription';
import { TATA_BOX_TYPICAL_POSITION } from '../../src/gene';

/**
 * Validates transcription tunable algorithm parameters - promoter search distances, the
 * TSS-proximity threshold, and the minimum promoter strength to report.
 *
 * References:
 * - Maston et al. (2006) Annual Review of Genomics and Human Genetics, "Transcriptional regulatory elements in the human genome"
 */
describe('Transcription tuning parameters', () => {
  test('MAX_PROMOTER_SEARCH_DISTANCE covers core and proximal elements', () => {
    expect(MAX_PROMOTER_SEARCH_DISTANCE).toBe(200);
    expect(MAX_PROMOTER_SEARCH_DISTANCE).toBeGreaterThanOrEqual(100);
    expect(MAX_PROMOTER_SEARCH_DISTANCE).toBeGreaterThan(Math.abs(TATA_BOX_TYPICAL_POSITION));
  });

  test('DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE is a wider default search window', () => {
    expect(DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE).toBe(1000);
    expect(DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE).toBeGreaterThan(MAX_PROMOTER_SEARCH_DISTANCE);
  });

  test('DEFAULT_DOWNSTREAM_SEARCH_DISTANCE is positive', () => {
    expect(DEFAULT_DOWNSTREAM_SEARCH_DISTANCE).toBe(100);
    expect(DEFAULT_DOWNSTREAM_SEARCH_DISTANCE).toBeGreaterThan(0);
  });

  test('TSS_PROXIMITY_THRESHOLD is a sensible cluster radius', () => {
    expect(TSS_PROXIMITY_THRESHOLD).toBe(10);
    expect(TSS_PROXIMITY_THRESHOLD).toBeGreaterThan(0);
  });

  test('DEFAULT_MIN_PROMOTER_STRENGTH is non-zero', () => {
    expect(DEFAULT_MIN_PROMOTER_STRENGTH).toBe(5);
    expect(DEFAULT_MIN_PROMOTER_STRENGTH).toBeGreaterThan(0);
  });
});
