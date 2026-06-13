/**
 * Tests covering the explicit-conversion contract between DNA and RNA. The implicit
 * cross-type constructor polymorphism (`new DNA(rna)` / `new RNA(dna)`) is gone; conversion
 * goes through `transcribeSequence` / `reverseTranscribeSequence` only.
 */

import {
  parseDNA,
  parseRNA,
  transcribeSequence,
  reverseTranscribeSequence,
} from '../../src/sequence';
import { DNA } from '../../src/sequence/DNA';
import { RNA } from '../../src/sequence/RNA';

function dna(sequence: string): DNA {
  return parseDNA(sequence).unwrap();
}

function rna(sequence: string): RNA {
  return parseRNA(sequence).unwrap();
}

describe('DNA/RNA explicit conversion', () => {
  const DNA_SEQ = 'ATCGATCG';
  const RNA_SEQ = 'AUCGAUCG';

  describe('transcribeSequence (DNA -> RNA)', () => {
    test('replaces T with U and preserves other bases', () => {
      const result = transcribeSequence(dna(DNA_SEQ));
      expect(result).toBeInstanceOf(RNA);
      expect(result.sequence).toBe(RNA_SEQ);
    });

    test('preserves length', () => {
      const source = dna('ATCGATCGATCGATCG');
      expect(transcribeSequence(source).sequence.length).toBe(source.sequence.length);
    });

    test('handles single nucleotide', () => {
      expect(transcribeSequence(dna('A')).sequence).toBe('A');
      expect(transcribeSequence(dna('T')).sequence).toBe('U');
      expect(transcribeSequence(dna('C')).sequence).toBe('C');
      expect(transcribeSequence(dna('G')).sequence).toBe('G');
    });

    test('handles long sequences', () => {
      const long = 'ATCG'.repeat(100);
      expect(transcribeSequence(dna(long)).sequence).toBe(long.replaceAll('T', 'U'));
    });
  });

  describe('reverseTranscribeSequence (RNA -> DNA)', () => {
    test('replaces U with T and preserves other bases', () => {
      const result = reverseTranscribeSequence(rna(RNA_SEQ));
      expect(result).toBeInstanceOf(DNA);
      expect(result.sequence).toBe(DNA_SEQ);
    });

    test('handles single nucleotide', () => {
      expect(reverseTranscribeSequence(rna('A')).sequence).toBe('A');
      expect(reverseTranscribeSequence(rna('U')).sequence).toBe('T');
      expect(reverseTranscribeSequence(rna('C')).sequence).toBe('C');
      expect(reverseTranscribeSequence(rna('G')).sequence).toBe('G');
    });
  });

  describe('round-trip identity', () => {
    test('DNA -> RNA -> DNA returns the original DNA', () => {
      const original = dna(DNA_SEQ);
      const round = reverseTranscribeSequence(transcribeSequence(original));
      expect(round.sequence).toBe(original.sequence);
    });

    test('RNA -> DNA -> RNA returns the original RNA', () => {
      const original = rna(RNA_SEQ);
      const round = transcribeSequence(reverseTranscribeSequence(original));
      expect(round.sequence).toBe(original.sequence);
    });

    test('multiple round trips maintain sequence integrity', () => {
      const start = 'ATCGATCGATCG';
      const dna1 = dna(start);
      const rna1 = transcribeSequence(dna1);
      const dna2 = reverseTranscribeSequence(rna1);
      const rna2 = transcribeSequence(dna2);
      const dna3 = reverseTranscribeSequence(rna2);
      expect(dna3.sequence).toBe(start);
      expect(rna2.sequence).toBe(start.replaceAll('T', 'U'));
    });
  });

  describe('return type is the expected sibling class', () => {
    test('transcribed value is an RNA instance', () => {
      expect(transcribeSequence(dna(DNA_SEQ))).toBeInstanceOf(RNA);
    });

    test('reverse-transcribed value is a DNA instance', () => {
      expect(reverseTranscribeSequence(rna(RNA_SEQ))).toBeInstanceOf(DNA);
    });
  });
});
