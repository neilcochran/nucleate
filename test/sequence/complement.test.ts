import { parseDNA, parseRNA } from '../../src/sequence';
import { DNA } from '../../src/sequence/DNA';
import { RNA } from '../../src/sequence/RNA';

function dna(sequence: string) {
  return parseDNA(sequence).unwrap();
}

function rna(sequence: string) {
  return parseRNA(sequence).unwrap();
}

describe('getComplement', () => {
  test('returns the complement of a DNA sequence', () => {
    expect(dna('ATCG').getComplement().sequence).toBe('TAGC');
  });

  test('returns the complement of an RNA sequence', () => {
    expect(rna('AUCG').getComplement().sequence).toBe('UAGC');
  });

  test('return type is the expected sibling class', () => {
    expect(dna('ATCG').getComplement()).toBeInstanceOf(DNA);
    expect(rna('AUCG').getComplement()).toBeInstanceOf(RNA);
  });
});

describe('getReverseComplement', () => {
  test('returns the reverse complement of a DNA sequence', () => {
    expect(dna('ATCG').getReverseComplement().sequence).toBe('CGAT');
  });

  test('returns the reverse complement of an RNA sequence', () => {
    expect(rna('AUCG').getReverseComplement().sequence).toBe('CGAU');
  });

  test('palindromic restriction site equals its reverse complement', () => {
    expect(dna('GAATTC').getReverseComplement().sequence).toBe('GAATTC');
  });
});
