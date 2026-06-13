import { parseDNA, parseRNA } from '../../src/sequence';
import { DNA } from '../../src/sequence/DNA';
import { RNA } from '../../src/sequence/RNA';

describe('parseDNA', () => {
  test('returns success for a valid sequence', () => {
    const result = parseDNA('ATCG');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeInstanceOf(DNA);
      expect(result.data.sequence).toBe('ATCG');
    }
  });

  test('normalizes lowercase to uppercase', () => {
    const result = parseDNA('atcg');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe('ATCG');
    }
  });

  test('returns empty-sequence failure for an empty input', () => {
    const result = parseDNA('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe('dna/empty-sequence');
    }
  });

  test('returns invalid-characters failure with offending characters', () => {
    const result = parseDNA('ATCXYZ');
    expect(result.success).toBe(false);
    if (!result.success && result.error.kind === 'dna/invalid-characters') {
      expect(result.error.chars).toEqual(['X', 'Y', 'Z']);
      expect(result.error.firstAt).toBe(3);
    } else {
      fail('Expected invalid-characters failure');
    }
  });

  test('reports each distinct invalid character only once, in discovery order', () => {
    const result = parseDNA('AXTXG');
    expect(result.success).toBe(false);
    if (!result.success && result.error.kind === 'dna/invalid-characters') {
      expect(result.error.chars).toEqual(['X']);
      expect(result.error.firstAt).toBe(1);
    }
  });

  test('rejects RNA bases (U) in DNA input', () => {
    const result = parseDNA('AUCG');
    expect(result.success).toBe(false);
    if (!result.success && result.error.kind === 'dna/invalid-characters') {
      expect(result.error.chars).toContain('U');
    }
  });
});

describe('parseRNA', () => {
  test('returns success for a valid sequence', () => {
    const result = parseRNA('AUCG');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeInstanceOf(RNA);
      expect(result.data.sequence).toBe('AUCG');
    }
  });

  test('normalizes lowercase to uppercase', () => {
    const result = parseRNA('aucg');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe('AUCG');
    }
  });

  test('returns empty-sequence failure for an empty input', () => {
    const result = parseRNA('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe('rna/empty-sequence');
    }
  });

  test('returns invalid-characters failure with offending characters', () => {
    const result = parseRNA('AUCXYZ');
    expect(result.success).toBe(false);
    if (!result.success && result.error.kind === 'rna/invalid-characters') {
      expect(result.error.chars).toEqual(['X', 'Y', 'Z']);
      expect(result.error.firstAt).toBe(3);
    } else {
      fail('Expected invalid-characters failure');
    }
  });

  test('rejects DNA bases (T) in RNA input', () => {
    const result = parseRNA('ATCG');
    expect(result.success).toBe(false);
    if (!result.success && result.error.kind === 'rna/invalid-characters') {
      expect(result.error.chars).toContain('T');
    }
  });
});

describe('parse + unwrap idiom', () => {
  test('parseDNA(...).unwrap() yields the DNA on success', () => {
    expect(parseDNA('ATCG').unwrap().sequence).toBe('ATCG');
  });

  test('parseDNA(...).unwrap() throws on failure', () => {
    expect(() => parseDNA('').unwrap()).toThrow();
  });
});
