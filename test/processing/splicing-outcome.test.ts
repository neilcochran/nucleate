import { SplicingOutcome } from '../../src/processing';
import { parseMRNA } from '../../src/modifications';

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
