import { describeError } from '../../src';

describe('replication error renderers', () => {
  describe('describeError (RNAPrimerError)', () => {
    test('invalid-position mentions the offending value', () => {
      const message = describeError({ kind: 'primer/invalid-position', position: -7 });
      expect(message).toContain('-7');
    });

    test('invalid-sequence wraps the underlying RNA error', () => {
      const message = describeError({
        kind: 'primer/invalid-sequence',
        cause: { kind: 'rna/empty-sequence' },
      });
      expect(message.toLowerCase()).toContain('rna');
    });

    test('invalid-length mentions both the actual length and the acceptable range', () => {
      const message = describeError({
        kind: 'primer/invalid-length',
        length: 15,
        min: 3,
        max: 10,
      });
      expect(message).toContain('15');
      expect(message).toContain('3');
      expect(message).toContain('10');
    });
  });

  describe('describeError (OkazakiFragmentError)', () => {
    test('empty-id message', () => {
      const message = describeError({ kind: 'okazaki/empty-id' });
      expect(message.toLowerCase()).toContain('empty');
    });

    test('invalid-position mentions the field and value', () => {
      const message = describeError({
        kind: 'okazaki/invalid-position',
        position: -2,
        field: 'startPosition',
      });
      expect(message).toContain('-2');
      expect(message).toContain('startPosition');
    });

    test('invalid-range mentions both endpoints', () => {
      const message = describeError({
        kind: 'okazaki/invalid-range',
        startPosition: 100,
        endPosition: 50,
      });
      expect(message).toContain('100');
      expect(message).toContain('50');
    });

    test('primer-position-mismatch mentions both positions', () => {
      const message = describeError({
        kind: 'okazaki/primer-position-mismatch',
        primerPosition: 5,
        startPosition: 10,
      });
      expect(message).toContain('5');
      expect(message).toContain('10');
    });

    test('sequence-length-mismatch mentions both lengths', () => {
      const message = describeError({
        kind: 'okazaki/sequence-length-mismatch',
        sequenceLength: 7,
        expectedLength: 12,
      });
      expect(message).toContain('7');
      expect(message).toContain('12');
    });
  });

  describe('describeError (ReplicationError)', () => {
    test('template-too-short mentions both the actual length and the minimum', () => {
      const message = describeError({
        kind: 'replication/template-too-short',
        length: 5,
        minimum: 10,
      });
      expect(message).toContain('5');
      expect(message).toContain('10');
    });
  });
});
