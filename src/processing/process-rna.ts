import { Result, success, failure } from '../result/index.js';
import type { RNA } from '../sequence/index.js';
import { START_CODON, CODON_LENGTH, isStopCodon } from '../sequence/index.js';
import { unsafeRNA } from '../sequence/RNA.js';
import type { PreMRNA } from '../transcription/index.js';
import { mRNACoord } from '../coordinates/index.js';
import {
  findPolyadenylationSites,
  getStrongestPolyadenylationSite,
  add3PrimePolyATail,
  add3PrimePolyATailAtSite,
  DEFAULT_POLY_A_TAIL_LENGTH,
} from '../polyadenylation/index.js';
import { type MRNA, unsafeMRNA } from '../modifications/MRNA.js';
import { spliceRNA } from '../splicing/index.js';
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
   * Whether a coding sequence is required. The pipeline always searches for a CDS (the first
   * start codon followed by an in-frame stop). When `true`, a spliced sequence with no such CDS
   * is rejected. When `false`, it is tolerated: the resulting mRNA carries no coding boundaries
   * (`codingStart` / `codingEnd` / `codingSequence` are `undefined`). Disable for mutation
   * modeling that intentionally disrupts the coding sequence.
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
 * 4. Identify coding-sequence boundaries: the first `AUG` plus the next in-frame stop codon.
 *    When none is found, fail if `validateCodons` is set, otherwise produce a no-CDS mRNA.
 * 5. Wrap the result in an `MRNA` carrying the cap flag, coding boundaries (or `undefined`
 *    when no CDS), and tail length.
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
  if (!splicingResult.success) {
    return failure({ kind: 'splicing-failed', cause: splicingResult.error });
  }
  return processSpliced(splicingResult.data, opts);
}

/**
 * Runs the post-splicing portion of the {@link processRNA} pipeline on an already-spliced
 * RNA. Adds the 5' cap (metadata), locates the polyadenylation site (when enabled), appends
 * the poly-A tail, identifies coding-sequence boundaries (failing or tolerating a missing CDS
 * per `validateCodons`), and wraps the result in a mature {@link MRNA}.
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

  let finalSequence = splicedSequence;
  let polyATailLength = 0;
  if (opts.addPolyATail) {
    polyATailLength = opts.polyATailLength;
    // Reuse the polyadenylation tail helpers so cleavage-site resolution and the
    // cleave-then-append logic live in one place (`polyadenylation/tail.ts`). With a detected
    // signal, cleave at its site; with none, cleave at the sequence end (a no-op cleave) and
    // still append the tail. The helpers also enforce the poly-A tail-length bounds.
    const strongest = getStrongestPolyadenylationSite(findPolyadenylationSites(splicedRNA));
    const tailed = strongest
      ? add3PrimePolyATailAtSite(splicedRNA, strongest, polyATailLength)
      : add3PrimePolyATail(splicedRNA, splicedSequence.length, polyATailLength);
    if (!tailed.success) {
      return failure({ kind: 'polyadenylation-failed', cause: tailed.error });
    }
    finalSequence = tailed.data.sequence;
  }

  // Always look for a real CDS. When found, the mRNA carries the true coding boundaries. When
  // none is found, `validateCodons: true` rejects the mRNA, while `validateCodons: false`
  // tolerates it and leaves the coding boundaries undefined - a legal no-CDS mRNA, rather than a
  // fabricated full-length [0, len - tail) span.
  const boundaries = findCodingBoundaries(finalSequence, polyATailLength);
  if (!boundaries.success && opts.validateCodons) {
    return failure(boundaries.error);
  }
  const coding = boundaries.success ? boundaries.data : undefined;

  return success(
    unsafeMRNA(
      unsafeRNA(finalSequence),
      coding ? mRNACoord(coding.codingStart) : undefined,
      coding ? mRNACoord(coding.codingEnd) : undefined,
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
