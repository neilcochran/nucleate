import { Result, success, failure, isFailure, at } from '../result/index.js';
import { unsafeDNA } from '../sequence/DNA.js';
import { unsafeRNA } from '../sequence/RNA.js';
import type { Gene } from '../gene/index.js';
import { geneCoord, type GeneCoord, type GenomicRegion } from '../coordinates/index.js';
import type { TranscriptionError } from './errors.js';
import { type PreMRNA, unsafePreMRNA } from './PreMRNA.js';
import { findPromoters, identifyTSS, type PromoterSearchOptions } from './promoter-recognition.js';
import {
  DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE,
  DEFAULT_DOWNSTREAM_SEARCH_DISTANCE,
  DEFAULT_MIN_PROMOTER_STRENGTH,
} from './biological-constants.js';

/**
 * Configuration options for {@link transcribe}.
 *
 * Defaults are inlined where they are read; consumers usually pass an empty object.
 */
export interface TranscriptionOptions {
  /** Maximum distance upstream of the first exon to search for promoters. Default 1000 bp. */
  maxPromoterSearchDistance?: number;

  /** Minimum strength score for a promoter to be accepted. Default 5. */
  minPromoterStrength?: number;

  /**
   * Forces the TSS to a specific gene-relative position, bypassing promoter detection.
   * `undefined` (the default) re-enables auto-detection.
   */
  forceTranscriptionStartSite?: number;
}

/**
 * Transcribes a {@link Gene} into a {@link PreMRNA}.
 *
 * Steps:
 * 1. Determine the transcription start site (gene-relative). If `options.forceTranscriptionStartSite`
 *    is set, that position is used directly; otherwise {@link findPromoters} + {@link identifyTSS}
 *    locate the strongest promoter upstream of the first exon and predict the TSS.
 * 2. Validate that the TSS is in-bounds and does not lie downstream of any exon start (which
 *    would produce negative transcript coordinates after translation).
 * 3. Convert the downstream gene DNA into RNA (replacing T with U). The transcript spans the
 *    TSS through the gene end; polyadenylation cleavage is modeled at processing time
 *    (`processSpliced` / `processRNA`), not here.
 * 4. Construct the {@link PreMRNA} (which eagerly computes transcript-coordinate exon and
 *    intron regions).
 *
 * @param gene - The gene to transcribe
 * @param options - Optional transcription configuration
 * @returns `Result<PreMRNA, TranscriptionError>`
 *
 * @example
 * ```typescript
 * const gene = parseGene(dnaSequence, exons).unwrap();
 * const result = transcribe(gene);
 * if (result.success) {
 *   const preMRNA = result.data;
 *   console.log(`Transcribed ${preMRNA.sequence.sequence.length}nt pre-mRNA`);
 *   console.log(`Has ${preMRNA.intronRegions.length} introns to splice`);
 * }
 * ```
 */
export function transcribe(
  gene: Gene,
  options: TranscriptionOptions = {},
): Result<PreMRNA, TranscriptionError> {
  const maxPromoterSearchDistance =
    options.maxPromoterSearchDistance ?? DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE;
  const minPromoterStrength = options.minPromoterStrength ?? DEFAULT_MIN_PROMOTER_STRENGTH;
  const geneSequence = gene.sequence.sequence;

  let tssValue: number;
  if (options.forceTranscriptionStartSite !== undefined) {
    tssValue = options.forceTranscriptionStartSite;
  } else {
    const tssResult = findTranscriptionStartSite(
      gene,
      maxPromoterSearchDistance,
      minPromoterStrength,
    );
    if (isFailure(tssResult)) {
      return failure(tssResult.error);
    }
    tssValue = tssResult.data;
  }

  if (tssValue < 0 || tssValue >= geneSequence.length) {
    return failure({
      kind: 'tss-out-of-bounds',
      tss: tssValue,
      sequenceLength: geneSequence.length,
    });
  }

  const tss = geneCoord(tssValue);
  const conflictingExons = gene.exons.reduce<number[]>((acc, exon, index) => {
    if (exon.start < tss) {
      acc.push(index);
    }
    return acc;
  }, []);
  if (conflictingExons.length > 0) {
    return failure({ kind: 'tss-conflicts-with-exons', tss, conflictingExons });
  }

  const transcriptRNA = unsafeRNA(geneSequence.substring(tssValue).replaceAll('T', 'U'));

  return success(unsafePreMRNA(transcriptRNA, gene, tss));
}

/**
 * Promoter-driven TSS detection. Builds a DNA window spanning the configured upstream search
 * distance plus a fixed downstream stretch, locates the strongest promoter via
 * {@link findPromoters}, and resolves its TSS via {@link identifyTSS}.
 *
 * @param gene - The gene whose first exon anchors the search window
 * @param maxPromoterSearchDistance - Upstream search radius in base pairs
 * @param minPromoterStrength - Strength threshold a promoter must clear to qualify
 * @returns `Result` with the gene-relative TSS or a {@link TranscriptionError} on failure
 */
function findTranscriptionStartSite(
  gene: Gene,
  maxPromoterSearchDistance: number,
  minPromoterStrength: number,
): Result<number, TranscriptionError> {
  const firstExon = gene.exons[0];
  if (firstExon === undefined) {
    return failure({ kind: 'gene-has-no-exons' });
  }
  const searchStart = Math.max(0, firstExon.start - maxPromoterSearchDistance);
  const searchEnd = Math.min(
    gene.sequence.sequence.length,
    firstExon.start + DEFAULT_DOWNSTREAM_SEARCH_DISTANCE,
  );
  const searchRegion: GenomicRegion<GeneCoord> = {
    start: geneCoord(searchStart),
    end: geneCoord(searchEnd),
  };

  const searchDNA = unsafeDNA(gene.sequence.sequence.substring(searchStart, searchEnd));

  const promoterOptions: PromoterSearchOptions = {
    maxUpstreamDistance: maxPromoterSearchDistance,
    maxDownstreamDistance: DEFAULT_DOWNSTREAM_SEARCH_DISTANCE,
    minStrengthScore: minPromoterStrength,
    minElements: 1,
  };

  const promoters = findPromoters(searchDNA, promoterOptions);
  if (promoters.length === 0) {
    return failure({
      kind: 'no-promoter-found',
      searchedRegion: searchRegion,
      minStrength: minPromoterStrength,
    });
  }

  const bestPromoter = at(promoters, 0);
  const tssPositions = identifyTSS(bestPromoter, searchDNA);
  const firstTss = tssPositions[0];
  if (firstTss === undefined) {
    return failure({ kind: 'tss-not-identifiable' });
  }

  return success(searchStart + firstTss);
}
