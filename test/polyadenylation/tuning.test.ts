import {
  DEFAULT_POLYA_SIGNAL_STRENGTH,
  MIN_POLYA_SITE_STRENGTH,
  MIN_RNA_SEQUENCE_FOR_POLYA_SEARCH,
  USE_ELEMENT_MAX_BOOST,
  DSE_ELEMENT_MAX_BOOST,
  MIN_POLY_A_DETECTION_LENGTH,
  POLYA_SIGNALS,
} from '../../src/polyadenylation';

/**
 * Validates the tunable scoring heuristics. These thresholds shift which polyadenylation
 * sites the analyzer ranks or reports; biology constants (signal sequences, offsets) live in
 * `biology.test.ts`.
 */
describe('Polyadenylation tuning constants', () => {
  test('DEFAULT_POLYA_SIGNAL_STRENGTH falls below every known signal', () => {
    expect(DEFAULT_POLYA_SIGNAL_STRENGTH).toBe(8);
    expect(DEFAULT_POLYA_SIGNAL_STRENGTH).toBeLessThan(Math.min(...Object.values(POLYA_SIGNALS)));
  });

  test('MIN_POLYA_SITE_STRENGTH filters weak sites', () => {
    expect(MIN_POLYA_SITE_STRENGTH).toBe(25);
    expect(MIN_POLYA_SITE_STRENGTH).toBeGreaterThan(DEFAULT_POLYA_SIGNAL_STRENGTH);
  });

  test('MIN_RNA_SEQUENCE_FOR_POLYA_SEARCH exceeds the minimum tail length', () => {
    expect(MIN_RNA_SEQUENCE_FOR_POLYA_SEARCH).toBe(20);
    expect(MIN_RNA_SEQUENCE_FOR_POLYA_SEARCH).toBeGreaterThan(MIN_POLY_A_DETECTION_LENGTH);
  });

  test('USE / DSE boosts are reasonable multipliers', () => {
    expect(USE_ELEMENT_MAX_BOOST).toBe(30);
    expect(DSE_ELEMENT_MAX_BOOST).toBe(20);
    expect(USE_ELEMENT_MAX_BOOST).toBeGreaterThan(DSE_ELEMENT_MAX_BOOST);
  });
});
