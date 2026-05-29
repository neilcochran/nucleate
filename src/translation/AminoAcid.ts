import type { Codon } from '../sequence/index.js';
import { unsafeCodon } from '../sequence/codons.js';
import { unsafeRNA } from '../sequence/RNA.js';
import type { AminoAcidData } from './AminoAcidData.js';

/**
 * A proteinogenic amino acid as encoded by a specific RNA codon.
 *
 * Composition over inheritance: an `AminoAcid` *has* an RNA codon and *has* a
 * {@link AminoAcidData} payload; biochemical properties (`name`, `singleLetterCode`,
 * `molecularWeight`, etc.) live on {@link data}.
 *
 * Public construction goes through `parseAminoAcid` (for reconstruction from raw codon
 * strings) or through the `translate` pipeline (for the mRNA -\> polypeptide flow). The
 * constructor is module-private and is not part of the package's public surface.
 */
export class AminoAcid {
  /** The validated, length-3 RNA codon that codes for this amino acid in this instance. */
  public readonly codon: Codon;

  /**
   * Biochemical data shared by every amino-acid instance of this type. Lookup is by codon;
   * alternate codons coding for the same amino acid share the same {@link AminoAcidData}
   * reference.
   */
  public readonly data: AminoAcidData;

  /**
   * Constructs an `AminoAcid`. Module-private; public callers must go through `parseAminoAcid`
   * or `translate`.
   *
   * @param codon - The validated, codon-length RNA
   * @param data - The validated amino-acid data (codon must appear in `data.codons`)
   *
   * @internal
   */
  constructor(codon: Codon, data: AminoAcidData) {
    this.codon = codon;
    this.data = data;
  }

  /**
   * Returns every codon that codes for this amino acid (including the one carried by this
   * instance), as fresh {@link Codon} instances. Alternate codons are the silent third-base
   * substitutions of degenerate codes.
   *
   * @returns Array of `Codon` values, in canonical order matching `data.codons`
   *
   * @example
   * ```typescript
   * const alanine = parseAminoAcid('GCA').unwrap();
   * alanine.getAllAlternateCodons().map(c => c.sequence); // ['GCA', 'GCC', 'GCG', 'GCU']
   * ```
   */
  getAllAlternateCodons(): Codon[] {
    return this.data.codons.map(codon => unsafeCodon(unsafeRNA(codon)));
  }

  /**
   * Reports whether another amino acid is the same proteinogenic type as this one but is
   * encoded by a different codon. Returns `false` for identical-codon comparisons (including
   * with `this`).
   *
   * @param other - The amino acid to compare against
   * @returns `true` if the two amino acids share a {@link AminoAcidData} but have different
   * codons
   *
   * @example
   * ```typescript
   * const a1 = parseAminoAcid('GCA').unwrap();
   * const a2 = parseAminoAcid('GCC').unwrap();
   * a1.isAlternateOf(a2); // true (both Alanine, different codons)
   * a1.isAlternateOf(a1); // false (same codon)
   * ```
   */
  isAlternateOf(other: AminoAcid): boolean {
    return (
      this.data.singleLetterCode === other.data.singleLetterCode &&
      this.codon.sequence !== other.codon.sequence
    );
  }

  /**
   * Reports structural equality with another amino acid: same proteinogenic type *and* same
   * codon. Two `AminoAcid` instances representing the same residue-codon pair are equal even
   * if they are different object references.
   *
   * @param other - The amino acid to compare against
   * @returns `true` if both `codon.sequence` and `data.singleLetterCode` match
   *
   * @example
   * ```typescript
   * const a1 = parseAminoAcid('GCA').unwrap();
   * const a2 = parseAminoAcid('GCA').unwrap();
   * a1.equals(a2); // true
   * ```
   */
  equals(other: AminoAcid): boolean {
    return (
      this.codon.sequence === other.codon.sequence &&
      this.data.singleLetterCode === other.data.singleLetterCode
    );
  }
}

/**
 * Constructs an {@link AminoAcid} without re-running validation. Reserved for
 * `translation/`-internal callers (the {@link parseAminoAcid} parser, the `translate`
 * pipeline).
 *
 * @param codon - The validated, codon-length RNA
 * @param data - The validated amino-acid data
 * @returns A new `AminoAcid`
 *
 * @internal
 */
export function unsafeAminoAcid(codon: Codon, data: AminoAcidData): AminoAcid {
  return new AminoAcid(codon, data);
}

/**
 * Constructs an {@link AminoAcid} from a trusted codon string and the matching data entry.
 * Skips RNA parsing, length validation, and codon-table lookup; the caller is asserting all
 * three are already known to be consistent.
 *
 * @param codonString - A validated RNA codon string (3 characters over `{A, C, G, U}`)
 * @param data - The validated amino-acid data for that codon
 * @returns A new `AminoAcid`
 *
 * @internal
 */
export function unsafeAminoAcidFromString(codonString: string, data: AminoAcidData): AminoAcid {
  return unsafeAminoAcid(unsafeCodon(unsafeRNA(codonString)), data);
}
