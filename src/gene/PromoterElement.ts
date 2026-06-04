import type { NucleotidePattern } from '../pattern/index.js';

/**
 * A single regulatory element of a gene promoter.
 *
 * Carries the nucleotide-level pattern that defines the element (e.g. the TATA-box IUPAC
 * pattern), a human-readable name, the position relative to the transcription start site
 * (negative for upstream elements, positive for downstream), and the score weight that the
 * containing {@link Promoter} adds to its strength score when this element is present.
 *
 * Public construction goes through `parsePromoterElement`; the constructor is module-private
 * and is not part of the package's public surface.
 */
export class PromoterElement {
  /** The nucleotide pattern that defines this promoter element. */
  public readonly pattern: NucleotidePattern;

  /** Human-readable name for this promoter element (e.g. `'TATA'`, `'Inr'`). */
  public readonly name: string;

  /**
   * Position relative to the transcription start site (TSS), in base pairs. Negative values are
   * upstream of the TSS; positive values are downstream; `0` overlaps the TSS.
   */
  public readonly position: number;

  /**
   * Score added to the containing promoter's strength score when this element is present. Used
   * by {@link Promoter.getStrengthScore} so per-element scoring lives with the element data
   * rather than in a hardcoded if/else chain.
   */
  public readonly scoreWeight: number;

  /**
   * Constructs a `PromoterElement`. Module-private; public callers must go through
   * `parsePromoterElement`.
   *
   * @param name - Element name
   * @param pattern - IUPAC nucleotide pattern that matches the element
   * @param position - Position relative to TSS, in base pairs
   * @param scoreWeight - Score contribution for promoter-strength calculation
   *
   * @internal
   */
  constructor(name: string, pattern: NucleotidePattern, position: number, scoreWeight: number) {
    this.name = name;
    this.pattern = pattern;
    this.position = position;
    this.scoreWeight = scoreWeight;
  }

  /**
   * Returns a string representation in the form `name@position`.
   *
   * @returns String of the form `name@position`
   */
  toString(): string {
    return `${this.name}@${this.position}`;
  }

  /**
   * Tests structural equality against another promoter element.
   *
   * Two elements are equal when their `name`, `position`, `scoreWeight`, and pattern source
   * string match.
   *
   * @param other - The other element to compare against
   * @returns `true` if both elements describe the same regulatory feature
   */
  equals(other: PromoterElement): boolean {
    return (
      this.name === other.name &&
      this.position === other.position &&
      this.scoreWeight === other.scoreWeight &&
      this.pattern.pattern === other.pattern.pattern
    );
  }
}
