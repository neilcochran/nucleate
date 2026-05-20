import { Result, success, failure, isFailure } from '../result/index.js';
import { transcribeSequence, type RNA } from '../sequence/index.js';
import type { Gene } from '../gene/index.js';
import type { PreMRNA } from '../transcription/index.js';
import type { MRNA } from '../modifications/MRNA.js';
import { processSpliced, type RNAProcessingOptions } from '../modifications/process-rna.js';
import type { ProcessingError } from '../modifications/errors.js';
import { translate } from '../translation/translate.js';
import { SplicingOutcome } from './splicing-outcome.js';
import {
  validateSpliceVariant,
  DEFAULT_ALTERNATIVE_SPLICING_OPTIONS,
  type SpliceVariant,
  type AlternativeSplicingOptions,
} from '../variants/index.js';
import type { SplicingError } from './errors.js';

/**
 * Combined option shape for variant-aware processing: governs both the variant-validation
 * rules (start/stop codon checks, reading-frame, structural constraints) and the
 * post-splicing processing pipeline (cap, polyadenylation, codon-boundary search).
 *
 * The two underlying interfaces share `validateCodons` with identical semantics; setting it
 * once governs both validation steps.
 */
export type SpliceVariantProcessingOptions = AlternativeSplicingOptions & RNAProcessingOptions;

/**
 * Splices a pre-mRNA according to a specific splice variant, returning the spliced
 * {@link RNA} (introns removed, variant-included exons concatenated, U bases).
 *
 * This performs only the splicing step. The result is a spliced transcript, not a mature
 * mRNA - no 5'-cap is added, no polyadenylation site is located, no poly-A tail is appended,
 * and no coding-sequence boundaries are identified. Callers needing a fully-processed
 * mature mRNA should use {@link processSpliceVariant} instead.
 *
 * @param preMRNA - The pre-mRNA whose source gene the variant references
 * @param variant - The splice variant to apply
 * @param options - Variant validation options (defaults applied where omitted)
 * @returns `Result<RNA, SplicingError>` carrying the spliced RNA on success
 */
export function spliceRNAWithVariant(
  preMRNA: PreMRNA,
  variant: SpliceVariant,
  options: AlternativeSplicingOptions = DEFAULT_ALTERNATIVE_SPLICING_OPTIONS,
): Result<RNA, SplicingError> {
  const sourceGene = preMRNA.sourceGene;
  const validation = validateSpliceVariant(variant, sourceGene, options);
  if (isFailure(validation)) {
    return failure(validation.error);
  }
  const variantDNA = sourceGene.getVariantSequence(variant);
  return success(transcribeSequence(variantDNA));
}

/**
 * Processes a pre-mRNA against a specific splice variant through the full
 * splicing-plus-processing pipeline, producing a mature {@link MRNA}.
 *
 * Routes the variant's spliced RNA through the same post-splicing logic as `processRNA`
 * (5'-cap metadata, polyadenylation site detection, poly-A tail append, coding-sequence
 * boundary identification when codon validation is enabled), so the resulting `MRNA` is a
 * genuine mature mRNA rather than a transcript-treated-as-coding shortcut.
 *
 * @param preMRNA - The pre-mRNA whose source gene the variant references
 * @param variant - The splice variant to apply
 * @param options - Combined validation and processing options (defaults applied where
 * omitted)
 * @returns `Result<MRNA, ProcessingError>` carrying the mature mRNA on success
 */
export function processSpliceVariant(
  preMRNA: PreMRNA,
  variant: SpliceVariant,
  options: SpliceVariantProcessingOptions = {},
): Result<MRNA, ProcessingError> {
  const spliceResult = spliceRNAWithVariant(preMRNA, variant, options);
  if (isFailure(spliceResult)) {
    return failure({ kind: 'splicing-failed', cause: spliceResult.error });
  }
  return processSpliced(spliceResult.data, options);
}

/**
 * Processes every splice variant in a gene's splicing profile through the full
 * splicing-plus-processing-plus-translation pipeline, producing a {@link SplicingOutcome}
 * per variant.
 *
 * Variants that fail validation, processing, or translation are skipped silently in the
 * output; if every variant fails (and at least one was tried), the function still returns
 * success with an empty array. The `polypeptideLength` carried on each outcome is the real
 * post-translation length (terminating at the first in-frame stop codon), not a
 * codingLength/3 estimate.
 *
 * @param preMRNA - The pre-mRNA whose source gene supplies the splicing profile
 * @param options - Combined validation and processing options
 * @returns `Result<SplicingOutcome[], SplicingError>` listing every successfully-processed
 * variant, or `no-splicing-profile` on failure
 */
export function processAllSplicingVariants(
  preMRNA: PreMRNA,
  options: SpliceVariantProcessingOptions = {},
): Result<SplicingOutcome[], SplicingError> {
  const sourceGene = preMRNA.sourceGene;
  const profile = sourceGene.splicingProfile;
  if (!profile) {
    return failure({ kind: 'no-splicing-profile' });
  }

  const outcomes: SplicingOutcome[] = [];
  for (const variant of profile.variants) {
    const processResult = processSpliceVariant(preMRNA, variant, options);
    if (!processResult.success) {
      continue;
    }
    const matureMRNA = processResult.data;
    const translateResult = translate(matureMRNA);
    if (!translateResult.success) {
      continue;
    }
    outcomes.push(new SplicingOutcome(variant, matureMRNA, translateResult.data.aminoAcids.length));
  }
  return success(outcomes);
}

/**
 * Resolves a gene's default splice variant and processes the pre-mRNA against it through
 * the full splicing-plus-processing pipeline.
 *
 * @param preMRNA - The pre-mRNA whose source gene supplies the default variant
 * @param options - Combined validation and processing options applied to the default variant
 * @returns `Result<MRNA, ProcessingError | SplicingError>` carrying the mature mRNA on
 * success; `no-default-variant` when the source gene has no default
 */
export function processDefaultSpliceVariant(
  preMRNA: PreMRNA,
  options: SpliceVariantProcessingOptions = {},
): Result<MRNA, ProcessingError | SplicingError> {
  const sourceGene = preMRNA.sourceGene;
  const defaultVariant = sourceGene.getDefaultSplicingVariant();
  if (!defaultVariant) {
    return failure({ kind: 'no-default-variant' });
  }
  return processSpliceVariant(preMRNA, defaultVariant, options);
}

/**
 * Lazy iterator yielding every splice variant of a gene that satisfies the supplied
 * {@link AlternativeSplicingOptions}.
 *
 * The iterator yields variants one at a time as the consumer pulls them, so callers can
 * `break` early, `take(n)`, or filter without paying for variants they never observe.
 *
 * Filtering applies the structural rules (first/last exon presence, minimum exon count) and,
 * when enabled, the reading-frame and start/stop-codon checks. Variants that fail validation
 * are skipped (not surfaced as errors); the iterator never throws.
 *
 * @param gene - The source gene
 * @param options - Validation options governing which variants are surfaced
 * @returns A generator over the matching variants in ascending bitmask order
 *
 * @example
 * ```typescript
 * for (const variant of enumerateSpliceVariants(gene)) {
 *   if (variant.includedExons.length === 3) {
 *     console.log(variant.name);
 *     break;
 *   }
 * }
 * ```
 */
export function* enumerateSpliceVariants(
  gene: Gene,
  options: AlternativeSplicingOptions = DEFAULT_ALTERNATIVE_SPLICING_OPTIONS,
): Generator<SpliceVariant, void, undefined> {
  const totalExons = gene.exons.length;
  if (totalExons === 0) {
    return;
  }
  const maxCombinations = 1 << totalExons;
  for (let mask = 1; mask < maxCombinations; mask++) {
    const includedExons: number[] = [];
    for (let e = 0; e < totalExons; e++) {
      if (mask & (1 << e)) {
        includedExons.push(e);
      }
    }

    const variant: SpliceVariant = {
      name: `generated-variant-${includedExons.join('-')}`,
      includedExons,
    };

    if (isFailure(validateSpliceVariant(variant, gene, options))) {
      continue;
    }

    yield variant;
  }
}
