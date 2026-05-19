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
 * Module-private construction key gating the {@link PreMRNA} constructor. Not re-exported
 * from the package barrel; in-tree callers reach it via {@link unsafePreMRNA}.
 *
 * @internal
 */
const UNSAFE_PREMRNA_KEY: unique symbol = Symbol('unsafe-premrna');

/**
 * Pre-mRNA: the unprocessed RNA transcript produced by transcription, before splicing,
 * capping, or polyadenylation. Carries the transcript {@link RNA}, the source {@link Gene},
 * the gene-relative TSS, the optional transcript-relative polyadenylation site, and the
 * exon/intron regions translated into transcript coordinates.
 *
 * Composition over inheritance: a `PreMRNA` *has* an {@link RNA} sequence; it does not extend
 * `RNA`. Coordinate translation is computed once at construction time and exposed via the
 * `exonRegions` / `intronRegions` fields, so getters are cheap and the cached layout cannot
 * drift from the source data.
 *
 * Public construction goes through `parsePreMRNA` or the `transcribe` pipeline; the
 * constructor is gated by a module-private sentinel.
 */
export class PreMRNA {
  /** The transcribed RNA sequence (still contains introns). */
  public readonly sequence: RNA;

  /** The gene that was transcribed to produce this pre-mRNA. */
  public readonly sourceGene: Gene;

  /** Gene-relative position of the transcription start site. */
  public readonly transcriptionStartSite: GeneCoord;

  /**
   * Transcript-relative position of the polyadenylation cleavage site, when one was located
   * during transcription. `undefined` when no polyadenylation signal was found.
   */
  public readonly polyadenylationSite?: TranscriptCoord;

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
   * @param polyadenylationSite - Optional transcript-relative cleavage site (branded)
   * @param exonRegions - Pre-computed, branded exon regions in transcript coordinates
   * @param intronRegions - Pre-computed, branded intron regions in transcript coordinates
   * @param trustedKey - Sentinel proving the caller is `transcription/`-internal
   *
   * @internal
   */
  constructor(
    sequence: RNA,
    sourceGene: Gene,
    transcriptionStartSite: GeneCoord,
    polyadenylationSite: TranscriptCoord | undefined,
    exonRegions: readonly GenomicRegion<TranscriptCoord>[],
    intronRegions: readonly GenomicRegion<TranscriptCoord>[],
    trustedKey: typeof UNSAFE_PREMRNA_KEY,
  ) {
    if (trustedKey !== UNSAFE_PREMRNA_KEY) {
      throw new Error('PreMRNA must be constructed via parsePreMRNA');
    }
    this.sequence = sequence;
    this.sourceGene = sourceGene;
    this.transcriptionStartSite = transcriptionStartSite;
    this.polyadenylationSite = polyadenylationSite;
    this.exonRegions = Object.freeze([...exonRegions]);
    this.intronRegions = Object.freeze([...intronRegions]);
  }

  /**
   * Returns the coding-portion (exons only) of the transcript by concatenating the substrings
   * named by `exonRegions`.
   *
   * The returned RNA is the spliced sequence that downstream processing produces; if the
   * transcript starts inside the first exon (TSS downstream of the exon start) the partial
   * exon is included.
   *
   * @returns Joined exon sequence as RNA
   */
  getCodingSequence(): RNA {
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
 * @param polyadenylationSite - Optional transcript-relative cleavage site (branded)
 * @returns A new `PreMRNA`
 *
 * @internal
 */
export function unsafePreMRNA(
  sequence: RNA,
  sourceGene: Gene,
  transcriptionStartSite: GeneCoord,
  polyadenylationSite: TranscriptCoord | undefined,
): PreMRNA {
  const transcriptLength = sequence.sequence.length;
  const exonRegions = translateExonsToTranscript(
    sourceGene.exons,
    transcriptionStartSite,
    transcriptLength,
  );
  const intronRegions = deriveIntronsFromExons(exonRegions);
  return new PreMRNA(
    sequence,
    sourceGene,
    transcriptionStartSite,
    polyadenylationSite,
    exonRegions,
    intronRegions,
    UNSAFE_PREMRNA_KEY,
  );
}

/**
 * Translates gene-coordinate exons into transcript-coordinate regions.
 *
 * The TSS-relative start is `exon.start - tss`. Exons that fall entirely upstream of the TSS
 * (transformed `end <= 0`) or entirely past the transcript end (transformed `start >= length`)
 * are dropped; partial exons are kept with their out-of-range bound preserved (negative start
 * or oversized end) so downstream consumers (`getCodingSequence`, splicing) can clamp.
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
