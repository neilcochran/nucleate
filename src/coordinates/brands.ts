/**
 * Branded coordinate types and conversion helpers.
 *
 * The library deals with positions in several distinct coordinate spaces - gene-relative,
 * transcript-relative, and eventually CDS-relative. Mixing them is the single most-common
 * bug source in the codebase. Branded `number` types make the coordinate space part of the
 * type, so the type system prevents accidental cross-space arithmetic at compile time.
 *
 * The brand is purely type-level: at runtime the values are ordinary numbers. Construct via
 * the {@link geneCoord} / {@link transcriptCoord} assignment primitives, and translate between
 * spaces via the conversion helpers.
 *
 * Each primitive applies its brand with a single `as` cast. This is the one sanctioned use of a
 * type assertion in the codebase: a phantom brand has no runtime representation to validate or
 * narrow against, so the cast is the only way to attach it. The brand tags the coordinate
 * *space*, not the value's range - positional sanity (non-negative, within sequence bounds) is
 * enforced where coordinates enter the system (`parseGene`, `transcribe`, ...), not here.
 */

/**
 * A position measured relative to the start of a gene's sequence (gene-relative coordinates).
 *
 * Used for `Gene.exons`, `Gene.introns`, and any other position expressed in the gene's own
 * coordinate frame. Distinct at the type level from {@link TranscriptCoord}; conversion goes
 * via {@link transcriptToGeneCoord} / {@link geneToTranscriptCoord}.
 */
export type GeneCoord = number & {
  /** Type-level brand. Not present at runtime. */
  readonly __brand: 'GeneCoord';
};

/**
 * A position measured relative to the start of a transcript (transcription start site = 0).
 *
 * Used for `PreMRNA.exonRegions`, `PreMRNA.intronRegions`, and any other position expressed
 * in transcript-relative coordinates. Distinct at the type level from {@link GeneCoord};
 * conversion goes via {@link geneToTranscriptCoord} / {@link transcriptToGeneCoord}.
 */
export type TranscriptCoord = number & {
  /** Type-level brand. Not present at runtime. */
  readonly __brand: 'TranscriptCoord';
};

/**
 * A position measured relative to the start of a mature mRNA (post-splicing and
 * post-poly-A-cleavage). 0 is the first nucleotide of the mature transcript; the coding region
 * boundaries on {@link MRNA} live in this space.
 *
 * Distinct at the type level from {@link TranscriptCoord} because intron removal and 3'
 * cleavage shift every downstream index: a `TranscriptCoord` of 120 in the pre-mRNA may
 * correspond to a `MatureMRNACoord` of 60 (or be absent if the position falls in a removed
 * intron). There is intentionally no converter from `TranscriptCoord`: the conversion is not
 * a fixed offset, it depends on the surrounding exon layout, so a caller that wants to cross
 * the boundary must walk the relevant `exons: readonly GenomicRegion<TranscriptCoord>[]` list
 * themselves and brand the result with {@link mRNACoord}. The brand exists to prevent
 * accidentally treating one coordinate space as another, not to imply a one-line conversion.
 */
export type MatureMRNACoord = number & {
  /** Type-level brand. Not present at runtime. */
  readonly __brand: 'MatureMRNACoord';
};

/**
 * Brands a plain number as a {@link GeneCoord}.
 *
 * The function performs no validation; it is the caller's responsibility to ensure that `n`
 * is a meaningful position in gene-relative coordinates.
 *
 * @param n - The numeric position
 * @returns `n` with the {@link GeneCoord} brand applied
 */
export function geneCoord(n: number): GeneCoord {
  return n as GeneCoord;
}

/**
 * Brands a plain number as a {@link TranscriptCoord}.
 *
 * The function performs no validation; it is the caller's responsibility to ensure that `n`
 * is a meaningful position in transcript-relative coordinates.
 *
 * @param n - The numeric position
 * @returns `n` with the {@link TranscriptCoord} brand applied
 */
export function transcriptCoord(n: number): TranscriptCoord {
  return n as TranscriptCoord;
}

/**
 * Brands a plain number as a {@link MatureMRNACoord}.
 *
 * The function performs no validation; it is the caller's responsibility to ensure that `n`
 * is a meaningful index in mature-mRNA coordinates (post-splicing, post-poly-A-cleavage).
 *
 * @param n - The numeric position
 * @returns `n` with the {@link MatureMRNACoord} brand applied
 */
export function mRNACoord(n: number): MatureMRNACoord {
  return n as MatureMRNACoord;
}

/**
 * Converts a {@link GeneCoord} into the corresponding {@link TranscriptCoord}, given the gene-relative
 * transcription start site.
 *
 * Positions upstream of the TSS produce negative {@link TranscriptCoord} values; downstream
 * positions produce non-negative values. The conversion is `coord - tss`.
 *
 * @param coord - The gene-relative position to convert
 * @param tss - The gene-relative position of the transcription start site
 * @returns The position in transcript-relative coordinates
 */
export function geneToTranscriptCoord(coord: GeneCoord, tss: GeneCoord): TranscriptCoord {
  return transcriptCoord(coord - tss);
}

/**
 * Converts a {@link TranscriptCoord} into the corresponding {@link GeneCoord}, given the gene-relative
 * transcription start site.
 *
 * The conversion is `coord + tss`.
 *
 * @param coord - The transcript-relative position to convert
 * @param tss - The gene-relative position of the transcription start site
 * @returns The position in gene-relative coordinates
 */
export function transcriptToGeneCoord(coord: TranscriptCoord, tss: GeneCoord): GeneCoord {
  return geneCoord(coord + tss);
}
