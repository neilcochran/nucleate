import type { MRNA } from '../modifications/index.js';
import type { AminoAcid } from './AminoAcid.js';
import { AminoAcidCharge } from './enums.js';
import type { AminoAcidSideChainType } from './enums.js';
import { WATER_AVERAGE_MASS } from './amino-acids.js';

/**
 * Aggregate residue composition of a {@link Polypeptide}, counted two ways. Both maps are sparse:
 * only the amino acids / side-chain classes actually present appear as keys.
 */
export interface PolypeptideComposition {
  /** Residue count keyed by single-letter amino-acid code (e.g. `{ M: 1, K: 2 }`). */
  readonly byAminoAcid: Readonly<Record<string, number>>;
  /** Residue count keyed by side-chain class. */
  readonly bySideChainType: Readonly<Partial<Record<AminoAcidSideChainType, number>>>;
}

/**
 * A polypeptide: the ordered amino-acid product of translating an mRNA's coding sequence.
 *
 * Composition over inheritance: a `Polypeptide` *has* an mRNA and an amino-acid sequence; it
 * is not a kind of sequence. Translation terminates at the first in-frame stop codon, so the
 * stored amino-acid sequence may be shorter than `mRNA.codingSequence.length / 3`.
 *
 * Public construction goes through the `translate` pipeline; the constructor is module-private
 * and is not part of the package's public surface.
 */
export class Polypeptide {
  /** The mRNA whose coding sequence produced this polypeptide. */
  public readonly mRNA: MRNA;

  /** Ordered amino acids, terminating at (but not including) the first in-frame stop codon. */
  public readonly aminoAcids: readonly AminoAcid[];

  /**
   * The single-letter-code string for {@link aminoAcids}, precomputed once at construction so the
   * string accessors ({@link getSequence}, {@link contains}, {@link startsWith}, {@link endsWith},
   * {@link indexOf}) are allocation-free reads. Mirrors the eager `MRNA.codingSequence` precompute.
   */
  private readonly sequence: string;

  /**
   * Constructs a `Polypeptide`. Module-private; public callers must go through `translate`.
   *
   * @param mRNA - The mRNA whose coding sequence produced this polypeptide
   * @param aminoAcids - The validated, in-order amino-acid sequence
   *
   * @internal
   */
  constructor(mRNA: MRNA, aminoAcids: readonly AminoAcid[]) {
    this.mRNA = mRNA;
    this.aminoAcids = aminoAcids;
    let sequence = '';
    for (const aa of aminoAcids) {
      sequence += aa.data.singleLetterCode;
    }
    this.sequence = sequence;
  }

  /**
   * The number of amino acids in the polypeptide. Reflects translation terminating at the first
   * in-frame stop codon, so it can be shorter than the coding sequence length divided by three.
   *
   * @returns The amino-acid count
   */
  get length(): number {
    return this.aminoAcids.length;
  }

  /**
   * Returns the polypeptide as a single-letter-code string (e.g. `'MKGK'`).
   *
   * @returns Concatenated single-letter amino-acid codes
   */
  getSequence(): string {
    return this.sequence;
  }

  /**
   * Reports whether this polypeptide contains the given amino-acid subsequence.
   *
   * @param subsequence - The polypeptide subsequence to search for
   * @returns `true` if the subsequence appears anywhere in the single-letter sequence
   */
  contains(subsequence: Polypeptide): boolean {
    return this.sequence.includes(subsequence.sequence);
  }

  /**
   * Reports whether this polypeptide starts with the given amino-acid prefix.
   *
   * @param prefix - The polypeptide prefix to test
   * @returns `true` if the single-letter sequence starts with `prefix`
   */
  startsWith(prefix: Polypeptide): boolean {
    return this.sequence.startsWith(prefix.sequence);
  }

  /**
   * Reports whether this polypeptide ends with the given amino-acid suffix.
   *
   * @param suffix - The polypeptide suffix to test
   * @returns `true` if the single-letter sequence ends with `suffix`
   */
  endsWith(suffix: Polypeptide): boolean {
    return this.sequence.endsWith(suffix.sequence);
  }

  /**
   * Returns the first index of the given amino-acid subsequence, or `-1` if the subsequence
   * does not appear.
   *
   * @param subsequence - The polypeptide subsequence to search for
   * @param startPosition - 0-based position to start searching from (default `0`)
   * @returns Index of the first match, or `-1`
   */
  indexOf(subsequence: Polypeptide, startPosition: number = 0): number {
    return this.sequence.indexOf(subsequence.sequence, startPosition);
  }

  /**
   * Average molecular weight of the polypeptide in Daltons.
   *
   * Sums the average free-amino-acid masses ({@link AminoAcidData.molecularWeight}) and subtracts
   * one {@link WATER_AVERAGE_MASS} per peptide bond - `(n - 1)` waters for `n` residues - to
   * account for the condensation reactions that join them. The result is an average mass (not
   * monoisotopic), matching the underlying data. An empty polypeptide weighs `0`.
   *
   * @returns The average molecular weight in Daltons
   */
  molecularWeight(): number {
    if (this.aminoAcids.length === 0) {
      return 0;
    }
    let sum = 0;
    for (const aa of this.aminoAcids) {
      sum += aa.data.molecularWeight;
    }
    return sum - (this.aminoAcids.length - 1) * WATER_AVERAGE_MASS;
  }

  /**
   * Mean Kyte-Doolittle hydrophobicity across all residues. Positive values indicate an overall
   * hydrophobic polypeptide; negative values, hydrophilic. An empty polypeptide returns `0`.
   *
   * @returns The mean per-residue hydrophobicity score
   */
  meanHydrophobicity(): number {
    if (this.aminoAcids.length === 0) {
      return 0;
    }
    let sum = 0;
    for (const aa of this.aminoAcids) {
      sum += aa.data.hydrophobicity;
    }
    return sum / this.aminoAcids.length;
  }

  /**
   * Net charge from the side chains at physiological pH (~7.0): `+1` per positively charged
   * residue (Arg, Lys, His), `-1` per negatively charged residue (Asp, Glu), `0` otherwise.
   *
   * This is a coarse side-chain-only approximation: it does not model the N- and C-termini, nor
   * the per-residue pKa values that a true titration curve requires. A pH-dependent `netCharge(pH)`
   * and `isoelectricPoint()` are deferred until {@link AminoAcidData} carries pKa values.
   *
   * @returns The summed side-chain charge as an integer
   */
  netChargeAtPhysiologicalPH(): number {
    let net = 0;
    for (const aa of this.aminoAcids) {
      if (aa.data.charge === AminoAcidCharge.POSITIVE) {
        net += 1;
      } else if (aa.data.charge === AminoAcidCharge.NEGATIVE) {
        net -= 1;
      }
    }
    return net;
  }

  /**
   * Residue composition of the polypeptide, counted both by individual amino acid and by
   * side-chain class. Both maps are sparse: a residue or class that does not occur is absent
   * rather than present with a count of `0`.
   *
   * @returns A {@link PolypeptideComposition} with `byAminoAcid` and `bySideChainType` counts
   */
  composition(): PolypeptideComposition {
    const byAminoAcid: Record<string, number> = {};
    const bySideChainType: Partial<Record<AminoAcidSideChainType, number>> = {};
    for (const aa of this.aminoAcids) {
      const code = aa.data.singleLetterCode;
      byAminoAcid[code] = (byAminoAcid[code] ?? 0) + 1;
      const sideChainType = aa.data.sideChainType;
      bySideChainType[sideChainType] = (bySideChainType[sideChainType] ?? 0) + 1;
    }
    return { byAminoAcid, bySideChainType };
  }
}

/**
 * Constructs a {@link Polypeptide} without re-running validation. Provides symmetry with the
 * other gated types' unsafe factories.
 *
 * @param mRNA - The mRNA whose coding sequence produced this polypeptide
 * @param aminoAcids - The validated, in-order amino-acid sequence
 * @returns A new `Polypeptide`
 *
 * @internal
 */
export function unsafePolypeptide(mRNA: MRNA, aminoAcids: readonly AminoAcid[]): Polypeptide {
  return new Polypeptide(mRNA, aminoAcids);
}
