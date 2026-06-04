import { parseNucleotidePattern } from '../pattern/index.js';
import { PromoterElement } from './PromoterElement.js';

/**
 * Constructs a {@link PromoterElement} from a validated consensus-sequence string and a
 * compile-time-known set of biological parameters. The pattern is required to parse; a
 * malformed consensus is a programmer error in this file rather than a runtime concern, so the
 * helper throws synchronously if the IUPAC pattern fails to compile.
 *
 * @param name - Element name (e.g. `'TATA'`)
 * @param patternString - IUPAC consensus sequence
 * @param position - Position relative to TSS, in base pairs
 * @param scoreWeight - Per-element contribution to `Promoter.getStrengthScore`
 * @returns A `PromoterElement` ready for use in `findPromoters` / `Promoter` construction
 */
function buildConsensusElement(
  name: string,
  patternString: string,
  position: number,
  scoreWeight: number,
): PromoterElement {
  const patternResult = parseNucleotidePattern(patternString);
  if (!patternResult.success) {
    throw new Error(
      `Failed to compile promoter-element consensus pattern '${patternString}' for ${name}: ${JSON.stringify(patternResult.error)}`,
    );
  }
  return new PromoterElement(name, patternResult.data, position, scoreWeight);
}

/**
 * TATA box - the canonical core promoter element. Consensus `TATAWAR` (W = A/T, R = A/G),
 * typically -25 to -30 bp upstream of the TSS. Strongest single contributor to promoter
 * strength in this scoring model.
 */
export const TATA_BOX: PromoterElement = buildConsensusElement('TATA', 'TATAWAR', -25, 10);

/**
 * Initiator (Inr) - core promoter element overlapping the TSS. Modern BBCABW consensus
 * (B = C/G/T, W = A/T). Position 0 (TSS).
 */
export const INITIATOR: PromoterElement = buildConsensusElement('Inr', 'BBCABW', 0, 8);

/**
 * Downstream Promoter Element (DPE) - works cooperatively with Inr in TATA-less promoters.
 * Consensus `RGWYV` (R = A/G, W = A/T, Y = C/T, V = A/C/G), typically +28 to +35 bp downstream
 * of the TSS.
 */
export const DOWNSTREAM_PROMOTER_ELEMENT: PromoterElement = buildConsensusElement(
  'DPE',
  'RGWYV',
  30,
  6,
);

/**
 * CAAT box - common enhancer element typically -70 to -80 bp upstream of the TSS. Consensus
 * `GGCCAATCT`.
 */
export const CAAT_BOX: PromoterElement = buildConsensusElement('CAAT', 'GGCCAATCT', -75, 5);

/**
 * GC box - Sp1 binding site common in housekeeping-gene promoters. Consensus `GGGCGG`,
 * typically -40 to -110 bp upstream of the TSS.
 */
export const GC_BOX: PromoterElement = buildConsensusElement('GC', 'GGGCGG', -70, 4);

/**
 * C/EBP binding site - tissue-specific enhancer element. Consensus `RTTGCGYAAY`
 * (R = A/G, Y = C/T). Variable upstream position.
 */
export const CEBP_SITE: PromoterElement = buildConsensusElement('C/EBP', 'RTTGCGYAAY', -50, 0);

/**
 * E-box - basic helix-loop-helix transcription-factor binding site. Consensus `CANNTG`
 * (N = any nucleotide). Often found in tissue-specific promoters.
 */
export const E_BOX: PromoterElement = buildConsensusElement('E-box', 'CANNTG', -60, 0);

/**
 * AP-1 binding site - Jun/Fos heterodimer recognition sequence. Consensus `TGASTCA`
 * (S = G/C). Common in promoters and enhancers responsive to growth/stress signals.
 */
export const AP1_SITE: PromoterElement = buildConsensusElement('AP-1', 'TGASTCA', -40, 0);

/**
 * The full standard list of promoter elements used by `findPromoters` when no override is
 * supplied. Ordering follows core-then-proximal convention but is not load-bearing.
 */
export const STANDARD_PROMOTER_ELEMENTS = [
  TATA_BOX,
  INITIATOR,
  DOWNSTREAM_PROMOTER_ELEMENT,
  CAAT_BOX,
  GC_BOX,
  CEBP_SITE,
  E_BOX,
  AP1_SITE,
] as const;

/**
 * Core promoter elements (TATA, Inr, DPE) - the elements that directly determine transcription
 * initiation and TSS placement.
 */
export const CORE_PROMOTER_ELEMENTS = [TATA_BOX, INITIATOR, DOWNSTREAM_PROMOTER_ELEMENT] as const;

/**
 * Proximal promoter elements - regulatory elements that modulate transcription strength.
 * Typically within 200 bp of the TSS.
 */
export const PROXIMAL_PROMOTER_ELEMENTS = [CAAT_BOX, GC_BOX, CEBP_SITE, E_BOX, AP1_SITE] as const;

/**
 * Common promoter-element combinations that work synergistically, grouped by biological
 * archetype.
 */
export const PROMOTER_ELEMENT_COMBINATIONS = {
  /** TATA-containing promoters. */
  TATA_DEPENDENT: [TATA_BOX],
  /** TATA-less promoters that rely on Inr + DPE. */
  TATA_LESS: [INITIATOR, DOWNSTREAM_PROMOTER_ELEMENT],
  /** Strong promoters featuring TATA plus proximal enhancers. */
  STRONG_PROMOTER: [TATA_BOX, CAAT_BOX, GC_BOX],
  /** Housekeeping-gene promoters (Sp1-driven with Inr). */
  HOUSEKEEPING: [GC_BOX, INITIATOR],
  /** Tissue-specific promoters built around enhancer-binding factors. */
  TISSUE_SPECIFIC: [E_BOX, CEBP_SITE, AP1_SITE],
} as const;
