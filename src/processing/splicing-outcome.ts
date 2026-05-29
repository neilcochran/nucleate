import type { SpliceVariant } from '../variants/index.js';
import type { MRNA } from '../modifications/index.js';

/**
 * Outcome of processing a single splice variant: the mature mRNA it produces plus the
 * predicted polypeptide length. The coding sequence lives on {@link MRNA.codingSequence}.
 */
export class SplicingOutcome {
  /**
   * @param variant - The splice variant this outcome describes
   * @param matureMRNA - The mature mRNA produced by processing `variant`
   * @param polypeptideLength - Predicted polypeptide length in amino acids
   */
  constructor(
    public readonly variant: SpliceVariant,
    public readonly matureMRNA: MRNA,
    public readonly polypeptideLength: number,
  ) {}
}
