import { Result, success, failure } from '../result/index.js';
import { transcribeSequence, type RNA } from '../sequence/index.js';
import { validateSpliceVariant, type Gene } from '../gene/index.js';
import type { PreMRNA } from '../transcription/index.js';
import type { MRNA } from '../modifications/index.js';
import { translate } from '../translation/index.js';
import {
  DEFAULT_ALTERNATIVE_SPLICING_OPTIONS,
  type SpliceVariant,
  type AlternativeSplicingOptions,
  type VariantValidationError,
} from '../variants/index.js';
import { processSpliced, type RNAProcessingOptions } from './process-rna.js';
import type { SpliceVariantResult } from './splice-variant-result.js';
import type { ProcessingError, SpliceVariantSelectionError } from './errors.js';

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
 * @returns `Result<RNA, VariantValidationError>` carrying the spliced RNA on success
 */
export function spliceRNAWithVariant(
  preMRNA: PreMRNA,
  variant: SpliceVariant,
  options: AlternativeSplicingOptions = DEFAULT_ALTERNATIVE_SPLICING_OPTIONS,
): Result<RNA, VariantValidationError> {
  const sourceGene = preMRNA.sourceGene;
  const validation = validateSpliceVariant(variant, sourceGene, options);
  if (!validation.success) {
    return failure(validation.error);
  }
  const variantDNAResult = sourceGene.getVariantSequence(variant);
  if (!variantDNAResult.success) {
    return failure(variantDNAResult.error);
  }
  return success(transcribeSequence(variantDNAResult.data));
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
  if (!spliceResult.success) {
    return failure({ kind: 'splicing-failed', cause: spliceResult.error });
  }
  return processSpliced(spliceResult.data, options);
}

/**
 * Processes every splice variant in a gene's splicing profile through the full
 * splicing-plus-processing-plus-translation pipeline, producing one {@link SpliceVariantResult}
 * per variant.
 *
 * No variant is dropped: each profile variant yields exactly one tagged result - `translated`
 * (a {@link Polypeptide} was produced), `no-protein` (a mature mRNA with no coding sequence), or
 * `invalid` (could not be spliced/processed). This makes the protein-abolishing variants - the
 * interesting ones in a mutation context - visible rather than silently skipped, and removes the
 * empty-array ambiguity: an empty array means only that the profile had zero variants.
 *
 * Defaults `validateCodons` to `false` (tolerate), so a variant that disrupts the coding sequence
 * surfaces as `no-protein` instead of `invalid`. This is a deliberate divergence from
 * {@link processRNA} / {@link processSpliceVariant}, which keep `validateCodons: true` (strict);
 * enumerating a profile is inherently exploratory. Callers can override by passing
 * `validateCodons: true`.
 *
 * @param preMRNA - The pre-mRNA whose source gene supplies the splicing profile
 * @param options - Combined validation and processing options; `validateCodons` defaults to
 * `false` here
 * @returns `Result<SpliceVariantResult[], SpliceVariantSelectionError>` with one entry per profile
 * variant, or `no-splicing-profile` when the gene has no profile
 */
export function processAllSplicingVariants(
  preMRNA: PreMRNA,
  options: SpliceVariantProcessingOptions = {},
): Result<SpliceVariantResult[], SpliceVariantSelectionError> {
  const sourceGene = preMRNA.sourceGene;
  const profile = sourceGene.splicingProfile;
  if (!profile) {
    return failure({ kind: 'no-splicing-profile' });
  }

  const opts: SpliceVariantProcessingOptions = { validateCodons: false, ...options };

  const results: SpliceVariantResult[] = [];
  for (const variant of profile.variants) {
    const processResult = processSpliceVariant(preMRNA, variant, opts);
    if (!processResult.success) {
      results.push({ kind: 'invalid', variant, error: processResult.error });
      continue;
    }
    const matureMRNA = processResult.data;
    const translateResult = translate(matureMRNA);
    if (translateResult.success) {
      results.push({ kind: 'translated', variant, matureMRNA, polypeptide: translateResult.data });
    } else {
      // A processed mRNA fails translation only when it has no CDS (the `no-coding-sequence`
      // failure): a CDS located during processing always has a whole-codon reading frame, and the
      // sequence is already valid RNA. So the variant yielded an mRNA but no protein.
      results.push({ kind: 'no-protein', variant, matureMRNA });
    }
  }
  return success(results);
}

/**
 * Resolves a gene's default splice variant and processes the pre-mRNA against it through
 * the full splicing-plus-processing pipeline.
 *
 * @param preMRNA - The pre-mRNA whose source gene supplies the default variant
 * @param options - Combined validation and processing options applied to the default variant
 * @returns `Result<MRNA, ProcessingError | SpliceVariantSelectionError>` carrying the mature
 * mRNA on success; `no-default-variant` when the source gene has no default
 */
export function processDefaultSpliceVariant(
  preMRNA: PreMRNA,
  options: SpliceVariantProcessingOptions = {},
): Result<MRNA, ProcessingError | SpliceVariantSelectionError> {
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
 * Cost: the generator walks all `2^n - 1` non-empty exon-inclusion subsets (`n` = exon count),
 * so its worst-case length grows exponentially with the number of exons. Because it is lazy this
 * is free for callers that stop early, but fully draining it for a gene with many exons (say,
 * more than ~20) is intentionally expensive - prefer `break`/`take` or a bounded search there.
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

    if (!validateSpliceVariant(variant, gene, options).success) {
      continue;
    }

    yield variant;
  }
}
