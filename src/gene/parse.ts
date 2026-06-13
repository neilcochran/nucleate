import { Result, success, failure } from '../result/index.js';
import { parseDNA } from '../sequence/index.js';
import {
  geneCoord,
  deriveIntronsFromExons,
  type GeneCoord,
  type GenomicRegion,
} from '../coordinates/index.js';
import type { NucleotidePattern } from '../pattern/index.js';
import type { AlternativeSplicingProfile, AlternativeSplicingOptions } from '../variants/index.js';
import { validateSpliceVariant } from './validate-splice-variant.js';
import { Gene } from './Gene.js';
import { Promoter } from './Promoter.js';
import { PromoterElement } from './PromoterElement.js';
import type { GeneError, PromoterError, PromoterElementError } from './errors.js';
import { validateExons } from './validate-exons.js';

/**
 * Permissive options used by `validateSplicingProfile` so that `parseGene` only enforces
 * the always-on structural rules (empty inclusion list, duplicate exon indices, index
 * range) and not the biological-realism rules (first/last exon presence, minimum count,
 * reading frame, codons). The biological rules depend on runtime options the caller picks
 * at processing time, so the strict checks belong there, not at construction time.
 */
const STRUCTURAL_VALIDATION_ONLY: AlternativeSplicingOptions = {
  allowSkipFirstExon: true,
  allowSkipLastExon: true,
  requireMinimumExons: false,
  validateReadingFrames: false,
  validateCodons: false,
};

/**
 * Parses an untrusted DNA-sequence string and exon list into a {@link Gene}.
 *
 * The pipeline is, in order:
 * 1. Parse the sequence string into a {@link DNA} via {@link parseDNA} (returns
 *    `invalid-sequence` on failure)
 * 2. Run {@link validateExons} against the parsed sequence length (returns the structured
 *    exon-rule failure on failure)
 * 3. If a splicing profile is supplied, validate it against the exon count (returns
 *    `invalid-splicing-profile` on failure)
 * 4. Brand the exons as {@link GeneCoord} regions, derive intron regions, and construct the
 *    {@link Gene}
 *
 * @param sequence - Candidate DNA sequence (case-insensitive)
 * @param exons - Exon regions in gene-relative coordinates
 * @param name - Optional gene name
 * @param splicingProfile - Optional alternative-splicing profile
 * @returns `Result` whose success branch carries a `Gene` and whose failure branch carries
 * a {@link GeneError}
 *
 * @example
 * ```typescript
 * const result = parseGene('ATGCCCGGGAAATTTAAA', [
 *   { start: 0, end: 6, name: 'exon1' },
 *   { start: 12, end: 18, name: 'exon2' },
 * ], 'BRCA1');
 * if (result.success) {
 *   console.log(result.data.exons.length); // 2
 * }
 * ```
 */
export function parseGene(
  sequence: string,
  exons: readonly GenomicRegion[],
  name?: string,
  splicingProfile?: AlternativeSplicingProfile,
): Result<Gene, GeneError> {
  const dnaResult = parseDNA(sequence);
  if (!dnaResult.success) {
    return failure({ kind: 'gene/invalid-sequence', cause: dnaResult.error });
  }
  const dna = dnaResult.data;

  const exonValidation = validateExons(exons, dna.getSequence().length);
  if (!exonValidation.success) {
    return failure(exonValidation.error);
  }

  const brandedExons: GenomicRegion<GeneCoord>[] = exons.map(exon => ({
    start: geneCoord(exon.start),
    end: geneCoord(exon.end),
    name: exon.name,
  }));
  const brandedIntrons = deriveIntronsFromExons(brandedExons).map((intron, i) => ({
    start: intron.start,
    end: intron.end,
    name: `intron${i + 1}`,
  }));

  const gene = new Gene(dna, brandedExons, brandedIntrons, name, splicingProfile);

  if (splicingProfile !== undefined) {
    const profileValidation = validateSplicingProfile(splicingProfile, gene);
    if (!profileValidation.success) {
      return failure(profileValidation.error);
    }
  }

  return success(gene);
}

/**
 * Parses a transcription start site, element list, and optional name into a {@link Promoter}.
 *
 * @param transcriptionStartSite - TSS position (must be a finite non-negative integer)
 * @param elements - Validated promoter elements
 * @param name - Optional promoter name
 * @returns `Result<Promoter, PromoterError>`
 */
export function parsePromoter(
  transcriptionStartSite: number,
  elements: readonly PromoterElement[],
  name?: string,
): Result<Promoter, PromoterError> {
  if (!Number.isInteger(transcriptionStartSite) || transcriptionStartSite < 0) {
    return failure({ kind: 'promoter/invalid-tss', tss: transcriptionStartSite });
  }
  return success(new Promoter(geneCoord(transcriptionStartSite), elements, name));
}

/**
 * Parses an element name, IUPAC pattern, position, and score weight into a
 * {@link PromoterElement}.
 *
 * @param name - Element name (must be non-empty)
 * @param pattern - IUPAC nucleotide pattern matching the element
 * @param position - Position relative to TSS, in base pairs (must be an integer; may be
 * negative for elements upstream of the TSS)
 * @param scoreWeight - Score contribution for promoter-strength calculation (must be finite)
 * @returns `Result<PromoterElement, PromoterElementError>`
 */
export function parsePromoterElement(
  name: string,
  pattern: NucleotidePattern,
  position: number,
  scoreWeight: number,
): Result<PromoterElement, PromoterElementError> {
  if (name.length === 0) {
    return failure({ kind: 'promoter-element/empty-name' });
  }
  if (!Number.isInteger(position)) {
    return failure({ kind: 'promoter-element/invalid-position', position });
  }
  if (!Number.isFinite(scoreWeight)) {
    return failure({ kind: 'promoter-element/invalid-score-weight', scoreWeight });
  }
  return success(new PromoterElement(name, pattern, position, scoreWeight));
}

/**
 * Validates an alternative-splicing profile against a gene.
 *
 * Profile-level rules (owned by this function):
 * - profile must contain at least one variant
 * - the named default variant must exist in the list
 * - variant names within the profile must be unique
 *
 * Per-variant rules (delegated to {@link validateSpliceVariant} so the rules live in one
 * place): empty inclusion list, duplicate exon indices, index range, first/last exon
 * presence, minimum count, reading frame, start/stop codons. Per-variant failures are
 * surfaced as `'invalid-variant'` carrying the structured `VariantValidationError`.
 *
 * @param profile - The splicing profile to validate
 * @param gene - The gene the profile is attached to (used by `validateSpliceVariant` to
 * compute variant sequences and check ranges)
 * @returns `Result<void, GeneError>`
 */
function validateSplicingProfile(
  profile: AlternativeSplicingProfile,
  gene: Gene,
): Result<void, GeneError> {
  if (profile.variants.length === 0) {
    return failure({
      kind: 'gene/invalid-splicing-profile',
      reason: 'Splicing profile must contain at least one variant',
    });
  }

  const defaultExists = profile.variants.some(v => v.name === profile.defaultVariant);
  if (!defaultExists) {
    return failure({
      kind: 'gene/invalid-splicing-profile',
      reason: `Default variant '${profile.defaultVariant}' not found in variants list`,
    });
  }

  const variantNames = profile.variants.map(v => v.name);
  if (new Set(variantNames).size !== variantNames.length) {
    return failure({
      kind: 'gene/invalid-splicing-profile',
      reason: 'Splicing profile contains duplicate variant names',
    });
  }

  for (const variant of profile.variants) {
    const variantValidation = validateSpliceVariant(variant, gene, STRUCTURAL_VALIDATION_ONLY);
    if (!variantValidation.success) {
      return failure({ kind: 'gene/invalid-variant', cause: variantValidation.error });
    }
  }

  return success(undefined);
}
