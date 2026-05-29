import {
  fragmentLength,
  isComplete,
  parseLigatedFragment,
  parsePrimerOnlyFragment,
  parsePrimerRemovedFragment,
  parseRNAPrimer,
  parseSynthesizedFragment,
} from '../../src/replication';
import {
  ligate,
  removePrimer,
  synthesize,
  unsafeLigatedFragment,
  unsafePrimerOnlyFragment,
  unsafePrimerRemovedFragment,
  unsafeSynthesizedFragment,
} from '../../src/replication/OkazakiFragment';
import { parseDNA } from '../../src/sequence';

const PRIMER_AT_0 = parseRNAPrimer('AUCG', 0).unwrap();
const PRIMER_AT_100 = parseRNAPrimer('AUCG', 100).unwrap();

describe('OkazakiFragment', () => {
  describe('parsePrimerOnlyFragment', () => {
    test('accepts a primer-only fragment', () => {
      const result = parsePrimerOnlyFragment('frag-1', 0, 1000, PRIMER_AT_0);
      expect(result.success).toBe(true);
      if (result.success) {
        const f = result.data;
        expect(f.phase).toBe('primer-only');
        expect(f.id).toBe('frag-1');
        expect(f.startPosition).toBe(0);
        expect(f.endPosition).toBe(1000);
        expect(fragmentLength(f)).toBe(1000);
        expect(isComplete(f)).toBe(false);
      }
    });

    test('rejects empty id', () => {
      const result = parsePrimerOnlyFragment('', 0, 100, PRIMER_AT_0);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('empty-id');
      }
    });

    test('rejects negative start position', () => {
      const result = parsePrimerOnlyFragment('frag', -1, 100, PRIMER_AT_0);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-position') {
        expect(result.error.position).toBe(-1);
      }
    });

    test('rejects non-integer start position', () => {
      const result = parsePrimerOnlyFragment('frag', 1.5, 100, PRIMER_AT_0);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-position');
      }
    });

    test('rejects endPosition not strictly greater than startPosition', () => {
      const result = parsePrimerOnlyFragment('frag', 100, 100, PRIMER_AT_100);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'invalid-range') {
        expect(result.error.startPosition).toBe(100);
        expect(result.error.endPosition).toBe(100);
      }
    });

    test('rejects when primer position does not equal startPosition', () => {
      const result = parsePrimerOnlyFragment('frag', 50, 150, PRIMER_AT_0);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'primer-position-mismatch') {
        expect(result.error.primerPosition).toBe(0);
        expect(result.error.startPosition).toBe(50);
      }
    });
  });

  describe('parseSynthesizedFragment', () => {
    test('accepts a synthesized fragment with matching sequence length', () => {
      const sequence = parseDNA('ATCG').unwrap();
      const result = parseSynthesizedFragment('frag-x', 100, 104, PRIMER_AT_100, sequence);
      expect(result.success).toBe(true);
      if (result.success) {
        const f = result.data;
        expect(f.phase).toBe('synthesized');
        expect(f.sequence.sequence).toBe('ATCG');
        expect(fragmentLength(f)).toBe(4);
        expect(isComplete(f)).toBe(false);
      }
    });

    test('rejects sequence whose length does not match the range', () => {
      const sequence = parseDNA('AT').unwrap();
      const result = parseSynthesizedFragment('frag', 0, 10, PRIMER_AT_0, sequence);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'sequence-length-mismatch') {
        expect(result.error.sequenceLength).toBe(2);
        expect(result.error.expectedLength).toBe(10);
      }
    });

    test('shares the position / primer / id validation rules with the other parsers', () => {
      const sequence = parseDNA('ATCG').unwrap();
      const result = parseSynthesizedFragment('', 0, 4, PRIMER_AT_0, sequence);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('empty-id');
      }
    });
  });

  describe('parsePrimerRemovedFragment', () => {
    test('accepts a primer-removed fragment', () => {
      const sequence = parseDNA('ATCG').unwrap();
      const result = parsePrimerRemovedFragment('frag', 100, 104, PRIMER_AT_100, sequence);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phase).toBe('primer-removed');
        expect(result.data.sequence.sequence).toBe('ATCG');
        expect(isComplete(result.data)).toBe(false);
      }
    });

    test('rejects sequence whose length does not match the range', () => {
      const sequence = parseDNA('AT').unwrap();
      const result = parsePrimerRemovedFragment('frag', 0, 10, PRIMER_AT_0, sequence);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('sequence-length-mismatch');
      }
    });
  });

  describe('parseLigatedFragment', () => {
    test('accepts a ligated fragment', () => {
      const sequence = parseDNA('ATCG').unwrap();
      const result = parseLigatedFragment('frag', 100, 104, PRIMER_AT_100, sequence);
      expect(result.success).toBe(true);
      if (result.success) {
        const f = result.data;
        expect(f.phase).toBe('ligated');
        expect(f.sequence.sequence).toBe('ATCG');
        expect(isComplete(f)).toBe(true);
      }
    });
  });

  describe('phase transitions', () => {
    test('synthesize advances PrimerOnly to Synthesized, attaching the sequence', () => {
      const initial = parsePrimerOnlyFragment('frag', 0, 4, PRIMER_AT_0).unwrap();
      const sequence = parseDNA('ATCG').unwrap();
      const next = synthesize(initial, sequence);
      expect(next.phase).toBe('synthesized');
      expect(next.sequence.sequence).toBe('ATCG');
      expect(next.id).toBe(initial.id);
      expect(next.startPosition).toBe(initial.startPosition);
      expect(next.endPosition).toBe(initial.endPosition);
      expect(next.primer).toBe(initial.primer);
    });

    test('removePrimer advances Synthesized to PrimerRemoved, preserving the sequence', () => {
      const sequence = parseDNA('ATCG').unwrap();
      const synthesized = parseSynthesizedFragment('frag', 0, 4, PRIMER_AT_0, sequence).unwrap();
      const next = removePrimer(synthesized);
      expect(next.phase).toBe('primer-removed');
      expect(next.sequence).toBe(synthesized.sequence);
      expect(isComplete(next)).toBe(false);
    });

    test('ligate advances PrimerRemoved to Ligated, preserving the sequence', () => {
      const sequence = parseDNA('ATCG').unwrap();
      const primerRemoved = parsePrimerRemovedFragment(
        'frag',
        0,
        4,
        PRIMER_AT_0,
        sequence,
      ).unwrap();
      const next = ligate(primerRemoved);
      expect(next.phase).toBe('ligated');
      expect(next.sequence).toBe(primerRemoved.sequence);
      expect(isComplete(next)).toBe(true);
    });
  });

  describe('fragmentLength', () => {
    test('returns endPosition - startPosition for any phase', () => {
      const primerOnly = parsePrimerOnlyFragment('frag', 100, 250, PRIMER_AT_100).unwrap();
      const sequence = parseDNA('A'.repeat(150)).unwrap();
      const synthesized = parseSynthesizedFragment(
        'frag',
        100,
        250,
        PRIMER_AT_100,
        sequence,
      ).unwrap();
      expect(fragmentLength(primerOnly)).toBe(150);
      expect(fragmentLength(synthesized)).toBe(150);
    });
  });

  describe('isComplete', () => {
    test('only returns true for the Ligated phase', () => {
      const sequence = parseDNA('ATCG').unwrap();
      const primerOnly = parsePrimerOnlyFragment('frag', 0, 4, PRIMER_AT_0).unwrap();
      const synthesized = parseSynthesizedFragment('frag', 0, 4, PRIMER_AT_0, sequence).unwrap();
      const primerRemoved = parsePrimerRemovedFragment(
        'frag',
        0,
        4,
        PRIMER_AT_0,
        sequence,
      ).unwrap();
      const ligated = parseLigatedFragment('frag', 0, 4, PRIMER_AT_0, sequence).unwrap();
      expect([primerOnly, synthesized, primerRemoved, ligated].map(isComplete)).toEqual([
        false,
        false,
        false,
        true,
      ]);
    });
  });

  describe('internal unsafe factories', () => {
    test('produce fragments at the matching phase without re-validating', () => {
      const sequence = parseDNA('A').unwrap();
      const primerOnly = unsafePrimerOnlyFragment('x', 100, 101, PRIMER_AT_0);
      const synthesized = unsafeSynthesizedFragment('x', 100, 101, PRIMER_AT_0, sequence);
      const primerRemoved = unsafePrimerRemovedFragment('x', 100, 101, PRIMER_AT_0, sequence);
      const ligated = unsafeLigatedFragment('x', 100, 101, PRIMER_AT_0, sequence);
      expect(primerOnly.phase).toBe('primer-only');
      expect(synthesized.phase).toBe('synthesized');
      expect(primerRemoved.phase).toBe('primer-removed');
      expect(ligated.phase).toBe('ligated');
      expect(synthesized.sequence).toBe(sequence);
    });
  });
});
