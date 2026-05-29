import { Result, success, failure, isFailure } from '../result/index.js';
import type { RNA } from '../sequence/index.js';
import { unsafeRNA } from '../sequence/RNA.js';
import type { PreMRNA } from '../transcription/index.js';
import { START_CODON, CODON_LENGTH, isStopCodon } from '../sequence/index.js';
import { mRNACoord } from '../coordinates/index.js';
import { DEFAULT_POLY_A_TAIL_LENGTH } from '../polyadenylation/biology.js';
import { DEFAULT_CLEAVAGE_OFFSET } from '../polyadenylation/tuning.js';
import { type MRNA, unsafeMRNA } from './MRNA.js';
import { spliceRNA } from '../splicing/splicing.js';
import {
  findPolyadenylationSites,
  getStrongestPolyadenylationSite,
} from '../polyadenylation/polyadenylation.js';
import type { ProcessingError } from './errors.js';

/**
 * Configuration options for the {@link processRNA} pipeline.
 *
 * Defaults match the strictest biological-realism stance: cap added, tail added at the
 * default length, coding boundaries validated, splice sites validated.
 */
export interface RNAProcessingOptions {
  /** Whether to mark the resulting mRNA with a 5' methylguanosine cap. */
  readonly addFivePrimeCap?: boolean;

  /** Whether to add a 3' poly-A tail. */
  readonly addPolyATail?: boolean;

  /** Length of the 3' poly-A tail to add when `addPolyATail` is set. */
  readonly polyATailLength?: number;

  /**
   * Whether to validate that the spliced sequence contains a start codon followed by an
   * in-frame stop codon. Disable for mutation modeling that intentionally disrupts the
   * coding sequence.
   */
  readonly validateCodons?: boolean;

  /**
   * Whether to bypass splice-site validation during the splicing stage. Useful for modeling
   * splice-site mutations or working with synthetic transcripts whose introns deliberately
   * violate the canonical consensus.
   */
  readonly skipSpliceSiteValidation?: boolean;
}

/**
 * Default {@link RNAProcessingOptions} values applied where the caller omits a field.
 */
export const DEFAULT_RNA_PROCESSING_OPTIONS: Required<RNAProcessingOptions> = {
  addFivePrimeCap: true,
  addPolyATail: true,
  polyATailLength: DEFAULT_POLY_A_TAIL_LENGTH,
  validateCodons: true,
  skipSpliceSiteValidation: false,
};

/**
 * Processes a pre-mRNA through the complete RNA-processing pipeline, producing a mature
 * {@link MRNA}.
 *
 * Pipeline steps (in order):
 * 1. Splice out introns via {@link spliceRNA}, joining exons.
 * 2. Locate the strongest polyadenylation signal and compute the cleavage site (when
 *    polyadenylation is enabled).
 * 3. Cleave the spliced sequence at the cleavage site and append the poly-A tail.
 * 4. Identify coding-sequence boundaries (when codon validation is enabled): the first
 *    `AUG` plus the next in-frame stop codon.
 * 5. Wrap the result in an `MRNA` carrying the cap flag, coding boundaries, and tail
 *    length.
 *
 * @param preMRNA - The pre-mRNA to process
 * @param options - Optional processing configuration (defaults applied where omitted)
 * @returns `Result<MRNA, ProcessingError>` carrying the mature mRNA on success
 *
 * @example
 * ```typescript
 * const gene = parseGene(seq, exons).unwrap();
 * const preMRNA = transcribe(gene).unwrap();
 * const mRNA = processRNA(preMRNA).unwrap();
 * console.log(mRNA.codingSequence.sequence);
 * ```
 */
export function processRNA(
  preMRNA: PreMRNA,
  options: RNAProcessingOptions = {},
): Result<MRNA, ProcessingError> {
  const opts = { ...DEFAULT_RNA_PROCESSING_OPTIONS, ...options };

  const splicingResult = spliceRNA(preMRNA, {
    skipSpliceSiteValidation: opts.skipSpliceSiteValidation,
  });
  if (isFailure(splicingResult)) {
    return failure({ kind: 'splicing-failed', cause: splicingResult.error });
  }
  return processSpliced(splicingResult.data, opts);
}

/**
 * Runs the post-splicing portion of the {@link processRNA} pipeline on an already-spliced
 * RNA. Adds the 5' cap (metadata), locates the polyadenylation site (when enabled), appends
 * the poly-A tail, identifies coding-sequence boundaries (when codon validation is enabled),
 * and wraps the result in a mature {@link MRNA}.
 *
 * Use this directly when the splicing step happened elsewhere (e.g. variant-driven splicing
 * via `spliceRNAWithVariant`). For the full pre-mRNA -\> mature mRNA pipeline, use
 * {@link processRNA}.
 *
 * @param splicedRNA - The spliced RNA produced by splicing (introns removed, exons joined)
 * @param options - Optional processing configuration (defaults applied where omitted)
 * @returns `Result<MRNA, ProcessingError>` carrying the mature mRNA on success
 */
export function processSpliced(
  splicedRNA: RNA,
  options: RNAProcessingOptions = {},
): Result<MRNA, ProcessingError> {
  const opts = { ...DEFAULT_RNA_PROCESSING_OPTIONS, ...options };
  const splicedSequence = splicedRNA.sequence;

  let cleavageSite = splicedSequence.length;
  if (opts.addPolyATail) {
    const sites = findPolyadenylationSites(splicedRNA);
    const strongest = getStrongestPolyadenylationSite(sites);
    if (strongest) {
      const candidate =
        strongest.cleavageSite ??
        strongest.position + strongest.signal.length + DEFAULT_CLEAVAGE_OFFSET;
      cleavageSite = Math.min(candidate, splicedSequence.length);
    }
  }

  let finalSequence = splicedSequence;
  let polyATailLength = 0;
  if (opts.addPolyATail) {
    if (cleavageSite < splicedSequence.length) {
      finalSequence = splicedSequence.substring(0, cleavageSite);
    }
    polyATailLength = opts.polyATailLength;
    finalSequence += 'A'.repeat(polyATailLength);
  }

  let codingStart = 0;
  let codingEnd = finalSequence.length - polyATailLength;

  if (opts.validateCodons) {
    const boundaries = findCodingBoundaries(finalSequence, polyATailLength);
    if (isFailure(boundaries)) {
      return failure(boundaries.error);
    }
    codingStart = boundaries.data.codingStart;
    codingEnd = boundaries.data.codingEnd;
  }

  return success(
    unsafeMRNA(
      unsafeRNA(finalSequence),
      mRNACoord(codingStart),
      mRNACoord(codingEnd),
      opts.addFivePrimeCap,
      polyATailLength,
    ),
  );
}

/**
 * Locates the coding-sequence boundaries within a processed mRNA sequence: the first `AUG`
 * before the poly-A tail, and the first in-frame stop codon downstream of it.
 */
function findCodingBoundaries(
  sequence: string,
  polyATailLength: number,
): Result<{ codingStart: number; codingEnd: number }, ProcessingError> {
  const searchSequence = sequence.substring(0, sequence.length - polyATailLength);

  const startCodonIndex = searchSequence.indexOf(START_CODON);
  if (startCodonIndex === -1) {
    return failure({ kind: 'no-start-codon' });
  }

  let stopCodonEnd = -1;
  for (
    let i = startCodonIndex + CODON_LENGTH;
    i <= searchSequence.length - CODON_LENGTH;
    i += CODON_LENGTH
  ) {
    const codon = searchSequence.substring(i, i + CODON_LENGTH);
    if (isStopCodon(codon)) {
      stopCodonEnd = i + CODON_LENGTH;
      break;
    }
  }

  if (stopCodonEnd === -1) {
    return failure({ kind: 'no-in-frame-stop' });
  }

  return success({ codingStart: startCodonIndex, codingEnd: stopCodonEnd });
}
