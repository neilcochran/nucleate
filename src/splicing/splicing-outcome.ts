import type { RNA } from '../sequence/index.js';
import type { SpliceVariant } from '../variants/index.js';
import type { MRNA } from '../modifications/MRNA.js';

/**
 * Outcome of processing a single splice variant: the mature mRNA it produces plus the
 * derived coding sequence and predicted polypeptide length.
 */
export class SplicingOutcome {
  /**
   * @param variant - The splice variant this outcome describes
   * @param matureMRNA - The mature mRNA produced by processing `variant`
   * @param codingSequence - The variant's coding sequence as RNA
   * @param polypeptideLength - Predicted polypeptide length in amino acids
   */
  constructor(
    public readonly variant: SpliceVariant,
    public readonly matureMRNA: MRNA,
    public readonly codingSequence: RNA,
    public readonly polypeptideLength: number,
  ) {}
}
