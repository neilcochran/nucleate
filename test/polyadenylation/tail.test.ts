import { RNA, parseRNA } from '../../src/sequence';
import {
  add3PrimePolyATail,
  add3PrimePolyATailAtSite,
  remove3PrimePolyATail,
  has3PrimePolyATail,
  get3PrimePolyATailLength,
  getCoreSequence,
  DEFAULT_POLY_A_TAIL_LENGTH,
  MAX_POLY_A_TAIL_LENGTH,
  type PolyadenylationSite,
} from '../../src/polyadenylation';
import { parseMRNA } from '../../src/modifications';

function rna(sequence: string): RNA {
  return parseRNA(sequence).unwrap();
}

describe('MRNA.withCap', () => {
  test('marks an uncapped MRNA capped', () => {
    const mrna = parseMRNA('AUGAAACCCGGG', 0, 12, false, 0).unwrap();
    const capped = mrna.withCap();
    expect(capped.fivePrimeCap).toBe(true);
    expect(capped.sequence.sequence).toBe(mrna.sequence.sequence);
    expect(capped.codingStart).toBe(0);
    expect(capped.codingEnd).toBe(12);
  });

  test('returns the same instance when already capped', () => {
    const mrna = parseMRNA('AUGAAACCCGGG', 0, 12, true, 0).unwrap();
    expect(mrna.withCap()).toBe(mrna);
  });
});

describe('add3PrimePolyATail', () => {
  test('cleaves at the supplied site and appends the tail', () => {
    const result = add3PrimePolyATail(rna('AUGAAACCCGGGAAUAAACCC'), 15, 10);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe('AUGAAACCCGGGAAU' + 'A'.repeat(10));
    }
  });

  test('applies the default tail length when omitted', () => {
    const result = add3PrimePolyATail(rna('AUGAAACCCGGG'), 12);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence.length).toBe(12 + DEFAULT_POLY_A_TAIL_LENGTH);
    }
  });

  test('clamps cleavage site beyond sequence length to the sequence end', () => {
    const result = add3PrimePolyATail(rna('AUGAAACCCGGG'), 100, 5);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe('AUGAAACCCGGGAAAAA');
    }
  });

  test('rejects a negative cleavage site', () => {
    const result = add3PrimePolyATail(rna('AUGAAACCCGGG'), -1);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'polyadenylation/invalid-cleavage-site') {
      expect(result.error.cleavageSite).toBe(-1);
    }
  });

  test('rejects a negative tail length', () => {
    const result = add3PrimePolyATail(rna('AUGAAACCCGGG'), 12, -10);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('polyadenylation/invalid-tail-length');
    }
  });

  test('rejects a tail length larger than MAX_POLY_A_TAIL_LENGTH', () => {
    const result = add3PrimePolyATail(rna('AUGAAACCCGGG'), 12, MAX_POLY_A_TAIL_LENGTH + 1);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'polyadenylation/invalid-tail-length') {
      expect(result.error.max).toBe(MAX_POLY_A_TAIL_LENGTH);
    }
  });
});

describe('add3PrimePolyATailAtSite', () => {
  test("uses the site's cleavageSite when present", () => {
    const site: PolyadenylationSite = {
      position: 12,
      signal: 'AAUAAA',
      strength: 100,
      cleavageSite: 20,
    };
    const result = add3PrimePolyATailAtSite(rna('AUGAAACCCGGGAAUAAACCC'), site, 10);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe('AUGAAACCCGGGAAUAAACC' + 'A'.repeat(10));
    }
  });

  test('falls back to signal position + length + default offset when cleavageSite is undefined', () => {
    const site: PolyadenylationSite = {
      position: 12,
      signal: 'AAUAAA',
      strength: 100,
    };
    const result = add3PrimePolyATailAtSite(rna('AUGAAACCCGGGAAUAAACCC'), site, 5);
    expect(result.success).toBe(true);
    if (result.success) {
      // position 12 + signal 6 + default offset 15 = 33, clamped to sequence length 21
      expect(result.data.sequence).toBe('AUGAAACCCGGGAAUAAACCC' + 'A'.repeat(5));
    }
  });
});

describe('remove3PrimePolyATail', () => {
  test('strips a trailing A run', () => {
    const result = remove3PrimePolyATail(rna('AUGAAACCCGGGAAAAAAAAAA'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe('AUGAAACCCGGG');
    }
  });

  test('fails when no trailing A run is found', () => {
    const result = remove3PrimePolyATail(rna('AUGAAACCCGGGCCC'));
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error).toEqual({ kind: 'polyadenylation/no-poly-a-tail' });
    }
  });
});

describe('MRNA.hasCap', () => {
  test('returns true when the MRNA carries a cap', () => {
    expect(parseMRNA('AUGAAACCCGGG', 0, 12, true, 0).unwrap().hasCap()).toBe(true);
  });

  test('returns false when the MRNA is uncapped', () => {
    expect(parseMRNA('AUGAAACCCGGG', 0, 12, false, 0).unwrap().hasCap()).toBe(false);
  });
});

describe('has3PrimePolyATail', () => {
  test('detects a trailing A run of the default minimum length', () => {
    expect(has3PrimePolyATail(rna('AUGAAACCCGGGAAAAAAAAAA'))).toBe(true);
    expect(has3PrimePolyATail(rna('AUGAAACCCGGGCCC'))).toBe(false);
    expect(has3PrimePolyATail(rna('AUGAAACCCGGGAAA'))).toBe(false);
  });

  test('respects a custom minimum length', () => {
    const sequence = rna('AUGAAACCCGGGAAAAA');
    expect(has3PrimePolyATail(sequence, 3)).toBe(true);
    expect(has3PrimePolyATail(sequence, 5)).toBe(true);
    expect(has3PrimePolyATail(sequence, 10)).toBe(false);
  });
});

describe('get3PrimePolyATailLength', () => {
  test('counts trailing A bases', () => {
    expect(get3PrimePolyATailLength(rna('AUGAAACCCGGGAAAAAAAAAA'))).toBe(10);
    expect(get3PrimePolyATailLength(rna('AUGAAACCCGGGCCC'))).toBe(0);
    expect(get3PrimePolyATailLength(rna('AUGAAACCCGGGAAA'))).toBe(3);
  });
});

describe('getCoreSequence', () => {
  test('strips the trailing A run', () => {
    expect(getCoreSequence(rna('AUGAAACCCGGGAAAAAAAAAA'))?.sequence).toBe('AUGAAACCCGGG');
  });

  test('returns the input unchanged when no trailing A run is present', () => {
    expect(getCoreSequence(rna('AUGAAACCCGGGCCC'))?.sequence).toBe('AUGAAACCCGGGCCC');
  });

  test('returns undefined when the input is entirely poly-A', () => {
    expect(getCoreSequence(rna('AAAAAAAAAA'))).toBeUndefined();
  });
});

describe('MRNA.isFullyProcessed', () => {
  test('requires both cap and minimum poly-A tail length', () => {
    expect(parseMRNA('AUGAAACCCGGGAAAAAAAAAA', 0, 12, true, 10).unwrap().isFullyProcessed()).toBe(
      true,
    );
    expect(parseMRNA('AUGAAACCCGGGAAAAAAAAAA', 0, 12, false, 10).unwrap().isFullyProcessed()).toBe(
      false,
    );
    expect(parseMRNA('AUGAAACCCGGGAAAAA', 0, 12, true, 5).unwrap().isFullyProcessed()).toBe(false);
  });
});
