import { Result, success, failure, at } from '../result/index.js';
import type { DNA } from '../sequence/index.js';
import { unsafeDNA } from '../sequence/DNA.js';
import type { GeneCoord, GenomicRegion } from '../coordinates/index.js';
import type {
  AlternativeSplicingProfile,
  SpliceVariant,
  VariantValidationError,
} from '../variants/index.js';

/**
 * A gene: a `DNA` sequence together with its exon/intron structure, an optional name, and an
 * optional alternative-splicing profile.
 *
 * Composition over inheritance: a `Gene` *has* a {@link DNA} sequence, it is not a kind of DNA.
 * Cross-type conversions (DNA -\> RNA) use the sequence-level `transcribeSequence`; gene-level
 * transcription uses the `transcribe(gene)` pipeline function in `transcription/`.
 *
 * Coordinates are gene-relative ({@link GeneCoord}). Public construction goes through
 * `parseGene`; the constructor is module-private and is not part of the package's public surface.
 */
export class Gene {
  /** The validated DNA sequence backing this gene. */
  public readonly sequence: DNA;

  /** Exon regions in gene-relative coordinates, in caller-supplied order. */
  public readonly exons: readonly GenomicRegion<GeneCoord>[];

  /**
   * Intron regions in gene-relative coordinates, derived from the gaps between adjacent exons
   * when sorted by `start`. Pre-computed at construction time so getters are cheap.
   */
  public readonly introns: readonly GenomicRegion<GeneCoord>[];

  /** Optional gene name (e.g. `'BRCA1'`). */
  public readonly name?: string;

  /** Optional alternative-splicing profile describing variant exon-inclusion sets. */
  public readonly splicingProfile?: AlternativeSplicingProfile;

  /**
   * Constructs a `Gene`. Module-private; public callers must go through `parseGene`.
   *
   * @param sequence - The validated DNA sequence
   * @param exons - Validated, branded exon regions (caller order preserved)
   * @param introns - Validated, branded intron regions (derived from `exons`)
   * @param name - Optional gene identifier
   * @param splicingProfile - Optional alternative-splicing profile
   *
   * @internal
   */
  constructor(
    sequence: DNA,
    exons: readonly GenomicRegion<GeneCoord>[],
    introns: readonly GenomicRegion<GeneCoord>[],
    name: string | undefined,
    splicingProfile: AlternativeSplicingProfile | undefined,
  ) {
    this.sequence = sequence;
    this.exons = Object.freeze([...exons]);
    this.introns = Object.freeze([...introns]);
    this.name = name;
    this.splicingProfile = splicingProfile;
  }

  /**
   * Returns the mature-mRNA sequence assembled by concatenating exons in gene-position order.
   *
   * DNA-level concatenation (T, not U); the result is wrapped as a {@link DNA} so downstream
   * consumers stay in the typed lane. Use the `transcription/` pipeline for U-bearing
   * pre-mRNA / mature mRNA.
   *
   * @returns Concatenated exon sequence as DNA
   */
  getMatureSequence(): DNA {
    const sequence = this.sequence.sequence;
    const sortedExons = [...this.exons].sort((a, b) => a.start - b.start);
    return unsafeDNA(sortedExons.map(exon => sequence.substring(exon.start, exon.end)).join(''));
  }

  /**
   * Returns the DNA substring corresponding to the exon at `exonIndex`.
   *
   * @param exonIndex - 0-based index into `exons`
   * @returns The exon DNA subsequence
   *
   * @throws `RangeError` if `exonIndex` is out of bounds
   */
  getExonSequence(exonIndex: number): DNA {
    if (exonIndex < 0 || exonIndex >= this.exons.length) {
      throw new RangeError(
        `Exon index ${exonIndex} out of bounds. Gene has ${this.exons.length} exons.`,
      );
    }
    const exon = at(this.exons, exonIndex);
    return unsafeDNA(this.sequence.sequence.substring(exon.start, exon.end));
  }

  /**
   * Returns the DNA substring corresponding to the intron at `intronIndex`.
   *
   * @param intronIndex - 0-based index into `introns`
   * @returns The intron DNA subsequence
   *
   * @throws `RangeError` if `intronIndex` is out of bounds
   */
  getIntronSequence(intronIndex: number): DNA {
    if (intronIndex < 0 || intronIndex >= this.introns.length) {
      throw new RangeError(
        `Intron index ${intronIndex} out of bounds. Gene has ${this.introns.length} introns.`,
      );
    }
    const intron = at(this.introns, intronIndex);
    return unsafeDNA(this.sequence.sequence.substring(intron.start, intron.end));
  }

  /**
   * Returns all splice variants in the gene's splicing profile, or an empty array if no profile
   * is attached.
   *
   * @returns The splice variants (empty when no profile is attached)
   */
  getSplicingVariants(): readonly SpliceVariant[] {
    return this.splicingProfile?.variants ?? [];
  }

  /**
   * Returns the splicing profile's default variant, or `undefined` if no profile is attached.
   *
   * @returns The default `SpliceVariant`, or `undefined`
   */
  getDefaultSplicingVariant(): SpliceVariant | undefined {
    if (!this.splicingProfile) {
      return undefined;
    }
    const profile = this.splicingProfile;
    return profile.variants.find(v => v.name === profile.defaultVariant);
  }

  /**
   * Looks up a splice variant by name.
   *
   * @param variantName - The variant's `name`
   * @returns The matching variant, or `undefined` if not found / no profile is attached
   */
  getSplicingVariantByName(variantName: string): SpliceVariant | undefined {
    return this.splicingProfile?.variants.find(v => v.name === variantName);
  }

  /**
   * Returns the DNA-level mature sequence for a specific splice variant by concatenating the
   * variant's included exons in gene-position order.
   *
   * A {@link SpliceVariant} is an inert DTO that may reference exon indices outside this gene, so
   * this returns a {@link Result} rather than throwing: the failure branch carries a
   * `variant-invalid-exon-index` {@link VariantValidationError}. Uses the same bounds-guard +
   * {@link at} idiom as {@link getExonSequence} / {@link getIntronSequence}.
   *
   * @param variant - The splice variant whose mature sequence to assemble
   * @returns `Result.success` with the concatenated exon sequence as DNA, or `Result.failure`
   * when the variant references an exon index outside this gene
   */
  getVariantSequence(variant: SpliceVariant): Result<DNA, VariantValidationError> {
    const selectedExons: GenomicRegion<GeneCoord>[] = [];
    for (const exonIndex of variant.includedExons) {
      if (exonIndex < 0 || exonIndex >= this.exons.length) {
        return failure({
          kind: 'variant-invalid-exon-index',
          variantName: variant.name,
          exonIndex,
          totalExons: this.exons.length,
        });
      }
      selectedExons.push(at(this.exons, exonIndex));
    }
    selectedExons.sort((a, b) => a.start - b.start);
    const sequence = this.sequence.sequence;
    return success(
      unsafeDNA(selectedExons.map(exon => sequence.substring(exon.start, exon.end)).join('')),
    );
  }

  /**
   * Returns a string representation of the gene.
   *
   * @returns `'Gene[ (name)]?(Nnt, E exons, I introns)'`
   */
  toString(): string {
    const nameStr = this.name ? ` (${this.name})` : '';
    return `Gene${nameStr}(${this.sequence.getSequence().length}nt, ${this.exons.length} exons, ${this.introns.length} introns)`;
  }
}

/**
 * Constructs a {@link Gene} without re-running validation. Reserved for `gene/`-internal
 * callers.
 *
 * @param sequence - Validated DNA sequence
 * @param exons - Validated, branded exon regions
 * @param introns - Validated, branded intron regions
 * @param name - Optional gene name
 * @param splicingProfile - Optional, validated alternative-splicing profile
 * @returns A new `Gene`
 *
 * @internal
 */
export function unsafeGene(
  sequence: DNA,
  exons: readonly GenomicRegion<GeneCoord>[],
  introns: readonly GenomicRegion<GeneCoord>[],
  name: string | undefined,
  splicingProfile: AlternativeSplicingProfile | undefined,
): Gene {
  return new Gene(sequence, exons, introns, name, splicingProfile);
}
