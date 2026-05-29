/**
 * Tagged-union errors raised by the `splicing/` module: the `spliceRNA` splice operation and
 * the splice-site validators.
 *
 * Human-readable messages are produced by the renderer function below rather than carried
 * alongside the structured payload.
 */

import { makeDescriber } from '../result/index.js';
import type { DescriberArms } from '../result/index.js';

/**
 * Error variants produced by `spliceRNA`, `validateTranscriptSpliceSites`, and
 * `validateSpliceSites`.
 *
 * - `no-exons`: the pre-mRNA carries no exon regions to splice.
 * - `exon-out-of-bounds`: an exon region exceeds the transcript bounds.
 * - `invalid-donor-site`: an intron does not start with the canonical RNA donor (`GU`).
 * - `invalid-acceptor-site`: an intron does not end with the canonical RNA acceptor (`AG`).
 * - `intron-too-short`: an intron is shorter than the minimum splice-machinery threshold.
 */
export type SplicingError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'no-exons';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'exon-out-of-bounds';
      /** 0-based index of the offending exon. */
      readonly exonIndex: number;
      /** `start` of the offending exon. */
      readonly start: number;
      /** `end` of the offending exon. */
      readonly end: number;
      /** Length of the transcript the exon was checked against. */
      readonly sequenceLength: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-donor-site';
      /** 0-based intron index in transcript-coordinate order. */
      readonly intronIndex: number;
      /** Transcript-relative position where the donor was expected. */
      readonly position: number;
      /** The 2-base prefix actually found at that position. */
      readonly found: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-acceptor-site';
      /** 0-based intron index in transcript-coordinate order. */
      readonly intronIndex: number;
      /** Transcript-relative position where the acceptor was expected. */
      readonly position: number;
      /** The 2-base suffix actually found at that position. */
      readonly found: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'intron-too-short';
      /** 0-based intron index. */
      readonly intronIndex: number;
      /** Length of the intron in nucleotides. */
      readonly length: number;
      /** Minimum length required for splicing. */
      readonly min: number;
    };

/**
 * Per-`kind` renderers for {@link SplicingError}. Exported for cross-module spread: the
 * `processing/` module folds these arms into its `splicing-failed` cause renderer rather than
 * re-enumerating the splice variants. Intentionally not re-exported from the module barrel - it
 * is internal infrastructure, reached only by deep import (the same boundary the `unsafe*`
 * factories use).
 */
export const SPLICING_ERROR_ARMS: DescriberArms<SplicingError> = {
  'no-exons': () => 'Cannot splice RNA: no exons found in pre-mRNA',
  'exon-out-of-bounds': e =>
    `Exon ${e.exonIndex} region ${e.start}-${e.end} is outside transcript bounds (length ${e.sequenceLength})`,
  'invalid-donor-site': e =>
    `Invalid 5' splice site at transcript position ${e.position}: expected GU, found ${e.found}`,
  'invalid-acceptor-site': e =>
    `Invalid 3' splice site at transcript position ${e.position}: expected AG, found ${e.found}`,
  'intron-too-short': e =>
    `Intron ${e.intronIndex} is too short: ${e.length} bp (minimum ${e.min} bp required)`,
};

/** Renders a {@link SplicingError} as a human-readable message. */
export const describeSplicingError = makeDescriber<SplicingError>(SPLICING_ERROR_ARMS);
