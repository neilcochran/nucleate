/**
 * Tagged-union errors raised by the `splicing/` module: the `spliceRNA` splice operation and the
 * splice-site validators. The `kind` discriminators are namespaced under `splicing/`.
 * Human-readable messages are produced centrally by `describeError` (see `src/describe.ts`).
 */

/**
 * Error variants produced by `spliceRNA`, `validateTranscriptSpliceSites`, and
 * `validateSpliceSites`.
 *
 * - `splicing/no-exons`: the pre-mRNA carries no exon regions to splice.
 * - `splicing/exon-out-of-bounds`: an exon region exceeds the transcript bounds.
 * - `splicing/invalid-donor-site`: an intron does not start with the canonical RNA donor (`GU`).
 * - `splicing/invalid-acceptor-site`: an intron does not end with the canonical RNA acceptor
 *   (`AG`).
 * - `splicing/intron-too-short`: an intron is shorter than the minimum splice-machinery threshold.
 */
export type SplicingError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'splicing/no-exons';
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'splicing/exon-out-of-bounds';
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
      readonly kind: 'splicing/invalid-donor-site';
      /** 0-based intron index in transcript-coordinate order. */
      readonly intronIndex: number;
      /** Transcript-relative position where the donor was expected. */
      readonly position: number;
      /** The 2-base prefix actually found at that position. */
      readonly found: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'splicing/invalid-acceptor-site';
      /** 0-based intron index in transcript-coordinate order. */
      readonly intronIndex: number;
      /** Transcript-relative position where the acceptor was expected. */
      readonly position: number;
      /** The 2-base suffix actually found at that position. */
      readonly found: string;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'splicing/intron-too-short';
      /** 0-based intron index. */
      readonly intronIndex: number;
      /** Length of the intron in nucleotides. */
      readonly length: number;
      /** Minimum length required for splicing. */
      readonly min: number;
    };
