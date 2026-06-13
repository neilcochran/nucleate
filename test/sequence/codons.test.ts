import {
  CODON_LENGTH,
  START_CODON,
  STOP_CODONS,
  isStopCodon,
  validateReadingFrame,
} from '../../src/sequence';

describe('codon primitives', () => {
  test('CODON_LENGTH is 3', () => {
    expect(CODON_LENGTH).toBe(3);
  });

  test('START_CODON is AUG', () => {
    expect(START_CODON).toBe('AUG');
  });

  test('STOP_CODONS contains exactly UAA, UAG, UGA in canonical order', () => {
    expect(STOP_CODONS).toEqual(['UAA', 'UAG', 'UGA']);
    expect(STOP_CODONS.length).toBe(3);
  });

  test('STOP_CODONS array is frozen', () => {
    expect(Object.isFrozen(STOP_CODONS)).toBe(true);
  });
});

describe('isStopCodon', () => {
  test.each(['UAA', 'UAG', 'UGA'])('returns true for %s', codon => {
    expect(isStopCodon(codon)).toBe(true);
  });

  test('returns false for AUG', () => {
    expect(isStopCodon('AUG')).toBe(false);
  });

  test('returns false for non-stop codons', () => {
    expect(isStopCodon('GCU')).toBe(false);
    expect(isStopCodon('AAA')).toBe(false);
  });

  test('returns false for codon-length strings that are not stop codons', () => {
    expect(isStopCodon('XYZ')).toBe(false);
  });

  test('returns false for strings of the wrong length', () => {
    expect(isStopCodon('UA')).toBe(false);
    expect(isStopCodon('UAAA')).toBe(false);
    expect(isStopCodon('')).toBe(false);
  });
});

describe('validateReadingFrame', () => {
  test('succeeds when length is divisible by CODON_LENGTH and starts with AUG', () => {
    const result = validateReadingFrame('AUGAAACCC');
    expect(result.success).toBe(true);
  });

  test('fails with frame-misaligned when length is not divisible by 3', () => {
    const result = validateReadingFrame('AUGAA');
    expect(result.success).toBe(false);
    if (!result.success && result.error.kind === 'reading-frame/frame-misaligned') {
      expect(result.error.codingLength).toBe(5);
      expect(result.error.codonLength).toBe(3);
    } else {
      fail('Expected frame-misaligned failure');
    }
  });

  test('fails with missing-start-codon when expectedStart=0 and prefix is not AUG', () => {
    const result = validateReadingFrame('CCCAAACCC');
    expect(result.success).toBe(false);
    if (!result.success && result.error.kind === 'reading-frame/missing-start-codon') {
      expect(result.error.found).toBe('CCC');
      expect(result.error.position).toBe(0);
    } else {
      fail('Expected missing-start-codon failure');
    }
  });

  test('skips start-codon check when expectedStart > 0', () => {
    const result = validateReadingFrame('CCCAUGAAA', CODON_LENGTH);
    expect(result.success).toBe(true);
  });

  test('reports frame-misalignment relative to expectedStart', () => {
    const result = validateReadingFrame('AUGAAA', 1);
    expect(result.success).toBe(false);
    if (!result.success && result.error.kind === 'reading-frame/frame-misaligned') {
      expect(result.error.codingLength).toBe(5);
    }
  });
});
