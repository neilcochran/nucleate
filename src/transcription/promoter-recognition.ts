import type { DNA } from '../sequence/index.js';
import {
  Promoter,
  PromoterElement,
  parsePromoter,
  STANDARD_PROMOTER_ELEMENTS,
  CORE_PROMOTER_ELEMENTS,
} from '../gene/index.js';
import {
  MAX_PROMOTER_SEARCH_DISTANCE,
  TSS_PROXIMITY_THRESHOLD,
  DEFAULT_MIN_PROMOTER_STRENGTH,
} from './tuning.js';

/**
 * Configuration for {@link findPromoters}.
 *
 * All fields are optional; the {@link DEFAULT_SEARCH_OPTIONS} object holds the values used
 * when a caller omits a field.
 */
export interface PromoterSearchOptions {
  /** Maximum distance upstream of a candidate TSS to associate elements with that TSS. */
  maxUpstreamDistance?: number;

  /** Maximum distance downstream of a candidate TSS to associate elements with that TSS. */
  maxDownstreamDistance?: number;

  /** Minimum number of elements required to constitute a promoter. */
  minElements?: number;

  /** Custom set of elements to search for; defaults to {@link STANDARD_PROMOTER_ELEMENTS}. */
  elements?: readonly PromoterElement[];

  /** Minimum strength score for an emitted promoter. */
  minStrengthScore?: number;
}

const DEFAULT_SEARCH_OPTIONS: Required<PromoterSearchOptions> = {
  maxUpstreamDistance: MAX_PROMOTER_SEARCH_DISTANCE,
  maxDownstreamDistance: 50,
  minElements: 1,
  elements: STANDARD_PROMOTER_ELEMENTS,
  minStrengthScore: DEFAULT_MIN_PROMOTER_STRENGTH,
};

interface ElementMatch {
  readonly element: PromoterElement;
  readonly position: number;
  readonly sequence: string;
}

/**
 * Finds potential promoters in a DNA sequence by locating IUPAC-pattern matches for the
 * configured element set, clustering them around a predicted TSS, and emitting one
 * {@link Promoter} per cluster that meets the minimum-elements and minimum-strength
 * thresholds.
 *
 * Returned promoters are sorted by {@link Promoter.getStrengthScore} descending so the
 * caller can use the first entry as the most likely real promoter.
 *
 * @param dna - The DNA sequence to scan
 * @param options - Optional search-tuning parameters
 * @returns Array of candidate {@link Promoter} objects, strongest first
 *
 * @example
 * ```typescript
 * const dna = parseDNA('GGCCAATCTATAATGCATGCCC').unwrap();
 * const promoters = findPromoters(dna);
 * console.log(`Found ${promoters.length} potential promoters`);
 * ```
 */
export function findPromoters(dna: DNA, options: PromoterSearchOptions = {}): Promoter[] {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

  const elementMatches = findAllElementMatches(dna, opts.elements);
  const promoterCandidates = groupElementsIntoPromoters(elementMatches, opts);

  const promoters: Promoter[] = [];
  for (const candidate of promoterCandidates) {
    const promoterResult = parsePromoter(
      candidate.tss,
      candidate.elements.map(match => match.element),
      `promoter_${candidate.tss}`,
    );
    if (!promoterResult.success) {
      continue;
    }
    const promoter = promoterResult.data;
    if (promoter.getStrengthScore() >= opts.minStrengthScore) {
      promoters.push(promoter);
    }
  }

  return promoters.sort((a, b) => b.getStrengthScore() - a.getStrengthScore());
}

/**
 * Identifies candidate transcription start sites for a promoter relative to a DNA sequence.
 *
 * Resolution order:
 * 1. If the promoter has Initiator (`Inr`) elements, every Inr position becomes a TSS
 *    candidate.
 * 2. Otherwise, if it has TATA-box elements, each TATA element produces a predicted TSS
 *    (TATA position minus the element's TSS-relative offset).
 * 3. Otherwise, the promoter's `transcriptionStartSite` is returned unchanged.
 *
 * Predicted positions outside the sequence bounds are filtered out.
 *
 * @param promoter - The promoter to analyze
 * @param sequence - The DNA sequence that contains the promoter
 * @returns Array of TSS candidate positions in the supplied sequence's coordinate space
 *
 * @example
 * ```typescript
 * const tssPositions = identifyTSS(promoter, dna);
 * console.log(`Candidate TSS positions: ${tssPositions.join(', ')}`);
 * ```
 */
export function identifyTSS(promoter: Promoter, sequence: DNA): number[] {
  const tssPositions: number[] = [];
  const seqLength = sequence.sequence.length;

  const initiators = promoter.getElementsByName('Inr');
  if (initiators.length > 0) {
    for (const inr of initiators) {
      const tssPos = promoter.getElementPosition(inr);
      if (tssPos >= 0 && tssPos < seqLength) {
        tssPositions.push(tssPos);
      }
    }
    return tssPositions;
  }

  const tataBoxes = promoter.getElementsByName('TATA');
  if (tataBoxes.length > 0) {
    for (const tata of tataBoxes) {
      const tataPos = promoter.getElementPosition(tata);
      const predictedTSS = tataPos - tata.position;
      if (predictedTSS >= 0 && predictedTSS < seqLength) {
        tssPositions.push(predictedTSS);
      }
    }
    return tssPositions;
  }

  tssPositions.push(promoter.transcriptionStartSite);
  return tssPositions;
}

/**
 * Finds every position where an element pattern matches the DNA sequence.
 *
 * @param dna - The DNA sequence to scan
 * @param elements - Elements whose patterns to match
 * @returns Element-match records (one per pattern hit, preserving element order)
 */
function findAllElementMatches(dna: DNA, elements: readonly PromoterElement[]): ElementMatch[] {
  const matches: ElementMatch[] = [];
  for (const element of elements) {
    const patternMatches = element.pattern.findAll(dna);
    for (const match of patternMatches) {
      matches.push({ element, position: match.start, sequence: match.matched });
    }
  }
  return matches;
}

/**
 * Clusters element matches into candidate promoters anchored on core-element TSS predictions.
 *
 * @param matches - All element matches in the sequence
 * @param options - Resolved search options (defaults already applied)
 * @returns Candidate promoter clusters, each with the predicted TSS and the matches that fall
 * within range
 */
function groupElementsIntoPromoters(
  matches: readonly ElementMatch[],
  options: Required<PromoterSearchOptions>,
): Array<{ tss: number; elements: ElementMatch[] }> {
  const sortedMatches = [...matches].sort((a, b) => a.position - b.position);

  const coreMatches = sortedMatches.filter(match =>
    CORE_PROMOTER_ELEMENTS.some(core => core.name === match.element.name),
  );

  const candidates: Array<{ tss: number; elements: ElementMatch[] }> = [];
  for (const coreMatch of coreMatches) {
    const predictedTSS = predictTSSFromCoreElement(coreMatch);
    const associatedElements: ElementMatch[] = [];
    for (const match of sortedMatches) {
      const relativePosition = match.position - predictedTSS;
      if (
        relativePosition >= -options.maxUpstreamDistance &&
        relativePosition <= options.maxDownstreamDistance
      ) {
        associatedElements.push(match);
      }
    }
    if (associatedElements.length >= options.minElements) {
      candidates.push({ tss: predictedTSS, elements: associatedElements });
    }
  }

  return removeDuplicatePromoters(candidates);
}

/**
 * Predicts a TSS position from a core-element match.
 *
 * The TSS is the match position offset by the element's own TSS-relative position (Inr sits at
 * the TSS with offset 0, TATA upstream, DPE downstream), mirroring {@link identifyTSS}.
 *
 * @param match - A match for a core-promoter element
 * @returns The predicted TSS position for that match
 */
function predictTSSFromCoreElement(match: ElementMatch): number {
  return match.position - match.element.position;
}

/**
 * Collapses promoter candidates whose TSS values are within {@link TSS_PROXIMITY_THRESHOLD} of
 * each other, keeping the candidate with the most associated elements.
 *
 * @param candidates - The candidate clusters before deduplication
 * @returns Filtered candidate list
 */
function removeDuplicatePromoters(
  candidates: Array<{ tss: number; elements: ElementMatch[] }>,
): Array<{ tss: number; elements: ElementMatch[] }> {
  const filtered: Array<{ tss: number; elements: ElementMatch[] }> = [];
  for (const candidate of candidates) {
    const duplicateIndex = filtered.findIndex(
      existing => Math.abs(existing.tss - candidate.tss) <= TSS_PROXIMITY_THRESHOLD,
    );
    if (duplicateIndex === -1) {
      filtered.push(candidate);
    } else {
      const duplicate = filtered[duplicateIndex];
      if (duplicate !== undefined && candidate.elements.length > duplicate.elements.length) {
        filtered[duplicateIndex] = candidate;
      }
    }
  }
  return filtered;
}
