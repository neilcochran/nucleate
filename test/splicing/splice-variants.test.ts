import {
  exonSkippingVariant,
  truncationVariant,
  minimalVariant,
  fullLengthVariant,
} from '../../src/variants';
import { SplicingOutcome } from '../../src/splicing';
import { parseMRNA } from '../../src/modifications';

describe('splice variant pattern free functions', () => {
  describe('exonSkippingVariant', () => {
    test('returns every exon except those listed', () => {
      const variant = exonSkippingVariant('skip-1', 4, [1]);
      expect(variant.includedExons).toEqual([0, 2, 3]);
      expect(variant.name).toBe('skip-1');
      expect(variant.description).toBe('Skips exon 1');
    });

    test('pluralizes the description when multiple exons are skipped', () => {
      const variant = exonSkippingVariant('skip-many', 5, [1, 3]);
      expect(variant.description).toBe('Skips exons 1, 3');
    });

    test('allows the caller to override the description', () => {
      const variant = exonSkippingVariant('skip', 3, [1], 'custom');
      expect(variant.description).toBe('custom');
    });
  });

  describe('truncationVariant', () => {
    test('returns the leading N exons', () => {
      const variant = truncationVariant('trunc', 3);
      expect(variant.includedExons).toEqual([0, 1, 2]);
      expect(variant.description).toBe('Truncated to first 3 exons');
    });

    test('singular description for one-exon truncation', () => {
      const variant = truncationVariant('trunc1', 1);
      expect(variant.description).toBe('Truncated to first 1 exon');
    });
  });

  describe('minimalVariant', () => {
    test('sorts the input exon indices in ascending order', () => {
      const variant = minimalVariant('minimal', [3, 0, 2]);
      expect(variant.includedExons).toEqual([0, 2, 3]);
    });
  });

  describe('fullLengthVariant', () => {
    test('returns every exon index', () => {
      const variant = fullLengthVariant('full', 4);
      expect(variant.includedExons).toEqual([0, 1, 2, 3]);
      expect(variant.description).toBe('Full-length variant with all exons');
    });
  });
});

describe('SplicingOutcome', () => {
  test('stores fields as public-readonly without wrapper getters', () => {
    const variant = { name: 'v', includedExons: [0, 1] };
    const mRNA = parseMRNA('AUGUAA', 0, 6).unwrap();
    const outcome = new SplicingOutcome(variant, mRNA, 2);
    expect(outcome.variant).toBe(variant);
    expect(outcome.matureMRNA).toBe(mRNA);
    expect(outcome.polypeptideLength).toBe(2);
    // The wrapper getters are gone; sanity check that the methods don't exist
    expect((outcome as unknown as { getVariantName?: unknown }).getVariantName).toBeUndefined();
    expect((outcome as unknown as { getMRNALength?: unknown }).getMRNALength).toBeUndefined();
  });
});
