import type { RNA } from '../sequence/index.js';
import { unsafeRNA } from '../sequence/RNA.js';
import type { Gene } from '../gene/index.js';
import {
  transcriptCoord,
  deriveIntronsFromExons,
  type GeneCoord,
  type GenomicRegion,
  type TranscriptCoord,
} from '../coordinates/index.js';

/**
 * Pre-mRNA: the unprocessed RNA transcript produced by transcription, before splicing,
 * capping, or polyadenylation. Carries the transcript {@link RNA}, the source {@link Gene},
 * the gene-relative TSS, and the exon/intron regions translated into transcript coordinates.
 *
 * Transcription does not cleave: the transcript spans the TSS through the gene end.
 * Polyadenylation cleavage is modeled at processing time (`processSpliced` / `processRNA`),
 * which scans the spliced RNA for a polyadenylation signal and truncates accordingly.
 *
 * Composition over inheritance: a `PreMRNA` *has* an {@link RNA} sequence; it does not extend
 * `RNA`. Coordinate translation is computed once at construction time and exposed via the
 * `exonRegions` / `intronRegions` fields, so getters are cheap and the cached layout cannot
 * drift from the source data.
 *
 * Public construction goes through `parsePreMRNA` or the `transcribe` pipeline; the
 * constructor is module-private and is not part of the package's public surface.
 */
export class PreMRNA {
  /** The transcribed RNA sequence (still contains introns). */
  public readonly sequence: RNA;

  /** The gene that was transcribed to produce this pre-mRNA. */
  public readonly sourceGene: Gene;

  /** Gene-relative position of the transcription start site. */
  public readonly transcriptionStartSite: GeneCoord;

  /**
   * Exon regions translated into transcript-relative coordinates. Computed once at
   * construction from `sourceGene.exons` and {@link transcriptionStartSite}, and frozen.
   */
  public readonly exonRegions: readonly GenomicRegion<TranscriptCoord>[];

  /**
   * Intron regions translated into transcript-relative coordinates. Derived from the gaps
   * between adjacent transcript-coordinate exons (rather than from `sourceGene.introns`) so
   * that an upstream-of-TSS partial exon collapses its associated intron correctly. Frozen
   * at construction.
   */
  public readonly intronRegions: readonly GenomicRegion<TranscriptCoord>[];

  /**
   * Constructs a `PreMRNA`. Module-private; public callers must go through `parsePreMRNA` or
   * the `transcribe` pipeline.
   *
   * @param sequence - The validated RNA transcript
   * @param sourceGene - The gene that was transcribed
   * @param transcriptionStartSite - Gene-relative TSS (branded)
   * @param exonRegions - Pre-computed, branded exon regions in transcript coordinates
   * @param intronRegions - Pre-computed, branded intron regions in transcript coordinates
   *
   * @internal
   */
  constructor(
    sequence: RNA,
    sourceGene: Gene,
    transcriptionStartSite: GeneCoord,
    exonRegions: readonly GenomicRegion<TranscriptCoord>[],
    intronRegions: readonly GenomicRegion<TranscriptCoord>[],
  ) {
    this.sequence = sequence;
    this.sourceGene = sourceGene;
    this.transcriptionStartSite = transcriptionStartSite;
    this.exonRegions = Object.freeze([...exonRegions]);
    this.intronRegions = Object.freeze([...intronRegions]);
  }

  /**
   * Returns the spliced transcript: every exon region joined in order, with the introns
   * removed.
   *
   * This is the full exonic sequence (5' UTR, coding region, and 3' UTR alike), not the coding
   * sequence - the name denotes the spliced join, not a CDS (for the validated CDS see
   * `MRNA.codingSequence`). Partial exons are clamped to the transcript bounds, so a transcript
   * that starts inside its first exon (TSS downstream of the exon start) contributes only its
   * in-transcript portion. This performs no splice-site validation; use {@link spliceRNA} for
   * the validated splice that downstream processing relies on.
   *
   * @returns Joined exon sequence as RNA
   */
  getSplicedSequence(): RNA {
    const sequence = this.sequence.sequence;
    const joined = this.exonRegions
      .map(exon => {
        const start = Math.max(0, exon.start);
        const end = Math.min(sequence.length, exon.end);
        return sequence.substring(start, end);
      })
      .join('');
    return unsafeRNA(joined);
  }

  /**
   * Reports whether this pre-mRNA contains introns to splice.
   *
   * @returns `true` when `intronRegions` is non-empty
   */
  hasIntrons(): boolean {
    return this.intronRegions.length > 0;
  }

  /**
   * Sums the lengths of all transcript-coordinate intron regions.
   *
   * @returns Total intron length in nucleotides
   */
  getTotalIntronLength(): number {
    return this.intronRegions.reduce((total, intron) => total + (intron.end - intron.start), 0);
  }

  /**
   * Sums the lengths of all transcript-coordinate exon regions, clamped to the transcript
   * bounds (so a partial-first-exon transcript reports only the in-transcript portion).
   *
   * @returns Total exon length in nucleotides
   */
  getTotalExonLength(): number {
    const sequenceLength = this.sequence.sequence.length;
    return this.exonRegions.reduce((total, exon) => {
      const start = Math.max(0, exon.start);
      const end = Math.min(sequenceLength, exon.end);
      return total + Math.max(0, end - start);
    }, 0);
  }

  /**
   * Returns a string representation of the pre-mRNA.
   *
   * @returns `'PreMRNA(Nnt, E exons, I introns)'`
   */
  toString(): string {
    return `PreMRNA(${this.sequence.sequence.length}nt, ${this.exonRegions.length} exons, ${this.intronRegions.length} introns)`;
  }
}

/**
 * Constructs a {@link PreMRNA} without re-running the biological-invariant validation done
 * by `transcribe`. Translates `sourceGene.exons` into transcript coordinates and derives the
 * corresponding intron regions from the gaps between adjacent transcript-coordinate exons.
 *
 * @param sequence - Validated RNA transcript
 * @param sourceGene - The gene that was transcribed
 * @param transcriptionStartSite - Gene-relative TSS (branded)
 * @returns A new `PreMRNA`
 *
 * @internal
 */
export function unsafePreMRNA(
  sequence: RNA,
  sourceGene: Gene,
  transcriptionStartSite: GeneCoord,
): PreMRNA {
  const transcriptLength = sequence.sequence.length;
  const exonRegions = translateExonsToTranscript(
    sourceGene.exons,
    transcriptionStartSite,
    transcriptLength,
  );
  const intronRegions = deriveIntronsFromExons(exonRegions);
  return new PreMRNA(sequence, sourceGene, transcriptionStartSite, exonRegions, intronRegions);
}

/**
 * Translates gene-coordinate exons into transcript-coordinate regions.
 *
 * The TSS-relative start is `exon.start - tss`. Exons that fall entirely upstream of the TSS
 * (transformed `end <= 0`) or entirely past the transcript end (transformed `start >= length`)
 * are dropped; partial exons are kept with their out-of-range bound preserved (negative start
 * or oversized end) so downstream consumers (`getSplicedSequence`, splicing) can clamp.
 */
function translateExonsToTranscript(
  exons: readonly GenomicRegion<GeneCoord>[],
  tss: GeneCoord,
  transcriptLength: number,
): GenomicRegion<TranscriptCoord>[] {
  const translated: GenomicRegion<TranscriptCoord>[] = [];
  for (const exon of exons) {
    const start = transcriptCoord(exon.start - tss);
    const end = transcriptCoord(exon.end - tss);
    if (end > 0 && start < transcriptLength) {
      translated.push({ start, end, name: exon.name });
    }
  }
  return translated;
}
