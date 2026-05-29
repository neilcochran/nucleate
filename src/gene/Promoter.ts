import { geneCoord, type GeneCoord } from '../coordinates/index.js';
import type { PromoterElement } from './PromoterElement.js';

/**
 * Multiplier applied to the total element count when a promoter has more than one element,
 * modelling the synergistic effect of cooperating regulatory features.
 *
 * Lives alongside the {@link Promoter} class because the strength-score calculation is the
 * only consumer; per-element score contributions live on each {@link PromoterElement} as
 * `scoreWeight`.
 */
export const PROMOTER_SYNERGY_MULTIPLIER = 2;

/**
 * A gene promoter: the cluster of regulatory elements that initiates transcription, together
 * with the transcription start site (TSS) they orient against.
 *
 * Public construction goes through `parsePromoter`; the constructor is module-private and is
 * not part of the package's public surface.
 */
export class Promoter {
  /** Promoter elements that comprise this promoter (immutable, in caller-supplied order). */
  public readonly elements: readonly PromoterElement[];

  /**
   * Position of the transcription start site (TSS) in gene-relative coordinates. Branded as
   * {@link GeneCoord} so it cannot be accidentally mixed with transcript-relative or
   * mature-mRNA-relative positions.
   */
  public readonly transcriptionStartSite: GeneCoord;

  /** Optional name/identifier for this promoter (e.g. `'beta-globin-promoter'`). */
  public readonly name?: string;

  /**
   * Constructs a `Promoter`. Module-private; public callers must go through `parsePromoter`.
   *
   * @param transcriptionStartSite - Validated, branded gene-coordinate TSS
   * @param elements - Promoter elements (the array is copied and frozen)
   * @param name - Optional identifier
   *
   * @internal
   */
  constructor(
    transcriptionStartSite: GeneCoord,
    elements: readonly PromoterElement[],
    name: string | undefined,
  ) {
    this.transcriptionStartSite = transcriptionStartSite;
    this.elements = Object.freeze([...elements]);
    this.name = name;
  }

  /**
   * Returns all elements whose `name` matches the supplied value.
   *
   * @param elementName - The element name to filter by (e.g. `'TATA'`, `'Inr'`)
   * @returns The matching elements, preserving the promoter's element order
   */
  getElementsByName(elementName: string): PromoterElement[] {
    return this.elements.filter(element => element.name === elementName);
  }

  /**
   * Reports whether the promoter contains at least one element with the supplied name.
   *
   * @param elementName - The element name to check for
   * @returns `true` if an element with that name is present
   */
  hasElement(elementName: string): boolean {
    return this.elements.some(element => element.name === elementName);
  }

  /**
   * Returns the genomic position of an element by composing the TSS with the element's
   * TSS-relative offset (`element.position`).
   *
   * @param element - The element whose position to compute
   * @returns The element's position in gene-relative coordinates
   */
  getElementPosition(element: PromoterElement): GeneCoord {
    return geneCoord(this.transcriptionStartSite + element.position);
  }

  /**
   * Returns the elements sorted from upstream (most negative position) to downstream.
   *
   * @returns A new array of elements sorted by `position` ascending
   */
  getElementsByPosition(): PromoterElement[] {
    return [...this.elements].sort((a, b) => a.position - b.position);
  }

  /**
   * Computes a coarse strength score for the promoter by summing each element's `scoreWeight`
   * and adding a synergy bonus when more than one element is present.
   *
   * This is a simplified model: real promoter strength depends on sequence context, chromatin
   * state, and many other factors. It is useful for ranking candidate promoters against each
   * other in `findPromoters`, not as an absolute biological measurement.
   *
   * @returns The promoter strength score (higher = stronger)
   */
  getStrengthScore(): number {
    let score = 0;
    for (const element of this.elements) {
      score += element.scoreWeight;
    }
    if (this.elements.length > 1) {
      score += this.elements.length * PROMOTER_SYNERGY_MULTIPLIER;
    }
    return score;
  }

  /**
   * Returns a string representation of the promoter.
   *
   * @returns `'Promoter[ (name)]? at TSS=N with elements: [...]'`
   */
  toString(): string {
    const elementNames = this.elements.map(e => e.name).join(', ');
    const nameStr = this.name ? ` (${this.name})` : '';
    return `Promoter${nameStr} at TSS=${this.transcriptionStartSite} with elements: [${elementNames}]`;
  }
}

/**
 * Constructs a {@link Promoter} without re-running validation. Reserved for `gene/`-internal
 * callers.
 *
 * @param transcriptionStartSite - Validated, branded gene-coordinate TSS
 * @param elements - Validated promoter elements
 * @param name - Optional promoter name
 * @returns A new `Promoter`
 *
 * @internal
 */
export function unsafePromoter(
  transcriptionStartSite: GeneCoord,
  elements: readonly PromoterElement[],
  name: string | undefined,
): Promoter {
  return new Promoter(transcriptionStartSite, elements, name);
}
