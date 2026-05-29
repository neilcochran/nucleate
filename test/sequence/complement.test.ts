import { parseDNA, parseRNA, complement, reverseComplement } from '../../src/sequence';
import { DNA } from '../../src/sequence/DNA';
import { RNA } from '../../src/sequence/RNA';

function dna(sequence: string) {
  return parseDNA(sequence).unwrap();
}

function rna(sequence: string) {
  return parseRNA(sequence).unwrap();
}

describe('complement (free function)', () => {
  test('returns the complement of a DNA sequence', () => {
    expect(complement(dna('ATCG')).sequence).toBe('TAGC');
  });

  test('returns the complement of an RNA sequence', () => {
    expect(complement(rna('AUCG')).sequence).toBe('UAGC');
  });

  test('return type is the expected sibling class', () => {
    expect(complement(dna('ATCG'))).toBeInstanceOf(DNA);
    expect(complement(rna('AUCG'))).toBeInstanceOf(RNA);
  });
});

describe('reverseComplement (free function)', () => {
  test('returns the reverse complement of a DNA sequence', () => {
    expect(reverseComplement(dna('ATCG')).sequence).toBe('CGAT');
  });

  test('returns the reverse complement of an RNA sequence', () => {
    expect(reverseComplement(rna('AUCG')).sequence).toBe('CGAU');
  });

  test('palindromic restriction site equals its reverse complement', () => {
    expect(reverseComplement(dna('GAATTC')).sequence).toBe('GAATTC');
  });
});
