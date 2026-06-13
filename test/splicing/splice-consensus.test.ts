import { SPLICE_CONSENSUS } from '../../src/splicing';

describe('SPLICE_CONSENSUS', () => {
  test('DNA-strand donor is GT', () => {
    expect(SPLICE_CONSENSUS.dna.donor).toBe('GT');
  });

  test('DNA-strand acceptor is AG', () => {
    expect(SPLICE_CONSENSUS.dna.acceptor).toBe('AG');
  });

  test('RNA-strand donor is GU', () => {
    expect(SPLICE_CONSENSUS.rna.donor).toBe('GU');
  });

  test('RNA-strand acceptor is AG', () => {
    expect(SPLICE_CONSENSUS.rna.acceptor).toBe('AG');
  });

  test('all consensuses are dinucleotides', () => {
    expect(SPLICE_CONSENSUS.dna.donor).toHaveLength(2);
    expect(SPLICE_CONSENSUS.dna.acceptor).toHaveLength(2);
    expect(SPLICE_CONSENSUS.rna.donor).toHaveLength(2);
    expect(SPLICE_CONSENSUS.rna.acceptor).toHaveLength(2);
  });

  test('combined GT-AG consensus reflects the U2 spliceosome', () => {
    expect(SPLICE_CONSENSUS.dna.donor + SPLICE_CONSENSUS.dna.acceptor).toBe('GTAG');
    expect(SPLICE_CONSENSUS.rna.donor + SPLICE_CONSENSUS.rna.acceptor).toBe('GUAG');
  });

  test('RNA donor swaps T for U vs DNA donor', () => {
    expect(SPLICE_CONSENSUS.rna.donor).toBe(SPLICE_CONSENSUS.dna.donor.replace(/T/g, 'U'));
  });
});
