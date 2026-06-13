/**
 * Canonical splice-site consensus dinucleotides. The GT-AG rule covers ~99% of mammalian
 * introns. Inspect `SPLICE_CONSENSUS.dna` when scanning over gene sequences; inspect
 * `SPLICE_CONSENSUS.rna` when validating transcript-coordinate introns on pre-mRNA.
 */
export const SPLICE_CONSENSUS = {
  /** DNA-strand consensus (T-based alphabet). */
  dna: {
    /** Canonical 5' splice-site donor (`GT`). */
    donor: 'GT',
    /** Canonical 3' splice-site acceptor (`AG`). */
    acceptor: 'AG',
  },
  /** RNA-strand consensus (U-based alphabet). */
  rna: {
    /** Canonical 5' splice-site donor (`GU`). */
    donor: 'GU',
    /** Canonical 3' splice-site acceptor (`AG`). */
    acceptor: 'AG',
  },
} as const;
