import { describeError } from '../../src';
import type { DNAError, RNAError, ReadingFrameError } from '../../src/sequence';

describe('describeDNAError', () => {
  test('renders empty-sequence', () => {
    const error: DNAError = { kind: 'dna/empty-sequence' };
    expect(describeError(error)).toContain('empty');
  });

  test('renders invalid-characters and includes the chars and position', () => {
    const error: DNAError = {
      kind: 'dna/invalid-characters',
      chars: ['X', 'Y'],
      firstAt: 3,
    };
    const message = describeError(error);
    expect(message).toContain('X');
    expect(message).toContain('Y');
    expect(message).toContain('3');
  });
});

describe('describeRNAError', () => {
  test('renders empty-sequence', () => {
    const error: RNAError = { kind: 'rna/empty-sequence' };
    expect(describeError(error)).toContain('empty');
  });

  test('renders invalid-characters and includes the chars and position', () => {
    const error: RNAError = {
      kind: 'rna/invalid-characters',
      chars: ['T'],
      firstAt: 1,
    };
    const message = describeError(error);
    expect(message).toContain('T');
    expect(message).toContain('1');
  });
});

describe('describeReadingFrameError', () => {
  test('renders frame-misaligned with the lengths', () => {
    const error: ReadingFrameError = {
      kind: 'reading-frame/frame-misaligned',
      codingLength: 5,
      codonLength: 3,
    };
    const message = describeError(error);
    expect(message).toContain('5');
    expect(message).toContain('3');
  });

  test('renders missing-start-codon with the codon and position', () => {
    const error: ReadingFrameError = {
      kind: 'reading-frame/missing-start-codon',
      found: 'CCC',
      position: 0,
    };
    const message = describeError(error);
    expect(message).toContain('CCC');
    expect(message).toContain('0');
    expect(message).toContain('AUG');
  });
});
