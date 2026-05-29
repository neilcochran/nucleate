import { Result, success, failure, at } from '../result/index.js';
import type { RNA } from '../sequence/index.js';
import { unsafeRNA } from '../sequence/RNA.js';
import type { PreMRNA } from '../transcription/index.js';
import { SPLICE_CONSENSUS } from './splice-consensus.js';
import type { SplicingError } from './errors.js';

/**
 * Options accepted by {@link spliceRNA}.
 */
export interface SpliceRNAOptions {
  /**
   * When `true`, skips the transcript-coordinate GU-AG splice-site validation. Useful for
   * modeling splice-site mutations or working with synthetic transcripts whose introns
   * deliberately violate the canonical consensus.
   */
  readonly skipSpliceSiteValidation?: boolean;
}

/**
 * Splices a {@link PreMRNA} by removing its intron regions and joining its exon regions to
 * produce a mature {@link RNA}.
 *
 * Splice-site validation runs in transcript coordinates against the RNA donor (`GU`) and
 * acceptor (`AG`) consensus. The structural rules (non-empty exon list, exon bounds within
 * the transcript) are enforced ahead of the consensus check.
 *
 * @param preMRNA - The pre-mRNA to splice
 * @param options - Optional splicing configuration
 * @returns `Result<RNA, SplicingError>` carrying the spliced mature RNA on success
 */
export function spliceRNA(
  preMRNA: PreMRNA,
  options: SpliceRNAOptions = {},
): Result<RNA, SplicingError> {
  const exonRegions = preMRNA.exonRegions;
  if (exonRegions.length === 0) {
    return failure({ kind: 'no-exons' });
  }

  const sequence = preMRNA.sequence.sequence;
  const sequenceLength = sequence.length;

  for (let i = 0; i < exonRegions.length; i++) {
    const exon = at(exonRegions, i);
    if (exon.start < 0 || exon.end > sequenceLength) {
      return failure({
        kind: 'exon-out-of-bounds',
        exonIndex: i,
        start: exon.start,
        end: exon.end,
        sequenceLength,
      });
    }
  }

  if (!options.skipSpliceSiteValidation) {
    const validation = validateTranscriptSpliceSites(preMRNA);
    if (!validation.success) {
      return failure(validation.error);
    }
  }

  let mature = '';
  for (const exon of exonRegions) {
    mature += sequence.substring(exon.start, exon.end);
  }
  return success(unsafeRNA(mature));
}

/**
 * Validates that every intron in a pre-mRNA satisfies the canonical RNA splice-site
 * consensus (`GU` donor, `AG` acceptor). Operates on transcript coordinates.
 *
 * @param preMRNA - The pre-mRNA whose intron regions should be validated
 * @returns `Result<void, SplicingError>` carrying the first failing rule on the failure
 * branch
 */
export function validateTranscriptSpliceSites(preMRNA: PreMRNA): Result<void, SplicingError> {
  const transcriptSequence = preMRNA.sequence.sequence;
  const introns = preMRNA.intronRegions;
  for (let i = 0; i < introns.length; i++) {
    const intron = at(introns, i);
    if (intron.start + 1 < transcriptSequence.length) {
      const donor = transcriptSequence.substring(intron.start, intron.start + 2);
      if (donor !== SPLICE_CONSENSUS.rna.donor) {
        return failure({
          kind: 'invalid-donor-site',
          intronIndex: i,
          position: intron.start,
          found: donor,
        });
      }
    }
    if (intron.end >= 2) {
      const acceptor = transcriptSequence.substring(intron.end - 2, intron.end);
      if (acceptor !== SPLICE_CONSENSUS.rna.acceptor) {
        return failure({
          kind: 'invalid-acceptor-site',
          intronIndex: i,
          position: intron.end - 2,
          found: acceptor,
        });
      }
    }
  }
  return success(undefined);
}
