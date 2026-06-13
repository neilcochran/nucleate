import { Result, success, failure } from '../result/index.js';
import { parseRNA } from '../sequence/index.js';
import { geneCoord } from '../coordinates/index.js';
import type { Gene } from '../gene/index.js';
import { type PreMRNA, unsafePreMRNA } from './PreMRNA.js';
import type { TranscriptionError } from './errors.js';

/**
 * Reconstructs a {@link PreMRNA} from saved data.
 *
 * Intended for callers holding a previously-serialized transcript (test fixtures, persisted
 * state). The normal path to a pre-mRNA is the `transcribe(gene)` pipeline, which derives all
 * inputs from the gene definition and enforces the biological invariants (TSS upstream of
 * every exon start, TSS inside the gene sequence). Those invariants are deliberately *not*
 * re-enforced here: a reconstruction may legitimately describe a partial-first-exon
 * transcript (TSS downstream of an exon start) or a synthetic edge case (TSS past the gene
 * end). The exon/intron translation is forgiving in both directions: exons that fall entirely
 * outside the transcript window are dropped; partial exons are clamped at use sites.
 *
 * Validation:
 * 1. The RNA sequence string is parsed via {@link parseRNA}.
 * 2. The TSS must be a finite non-negative integer.
 *
 * @param sequence - The RNA transcript string (will be parsed)
 * @param sourceGene - The gene that was transcribed
 * @param transcriptionStartSite - Gene-relative TSS (will be branded)
 * @returns `Result<PreMRNA, TranscriptionError>`
 *
 * @example
 * ```typescript
 * const gene = parseGene('ATGCCCGGGAAATTTAAA', [{ start: 0, end: 18 }]).unwrap();
 * const preMRNA = parsePreMRNA('AUGCCCGGGAAAUUUAAA', gene, 0).unwrap();
 * ```
 */
export function parsePreMRNA(
  sequence: string,
  sourceGene: Gene,
  transcriptionStartSite: number,
): Result<PreMRNA, TranscriptionError> {
  const rnaResult = parseRNA(sequence);
  if (!rnaResult.success) {
    return failure({ kind: 'transcription/invalid-rna-sequence', cause: rnaResult.error });
  }
  const rna = rnaResult.data;

  if (!Number.isInteger(transcriptionStartSite) || transcriptionStartSite < 0) {
    return failure({
      kind: 'transcription/tss-out-of-bounds',
      tss: transcriptionStartSite,
      sequenceLength: sourceGene.sequence.sequence.length,
    });
  }

  const tss = geneCoord(transcriptionStartSite);
  return success(unsafePreMRNA(rna, sourceGene, tss));
}
