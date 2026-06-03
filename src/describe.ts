/**
 * Central error rendering for the whole package.
 *
 * Every domain error is a discriminated union whose `kind` is namespaced by domain
 * (`dna/empty-sequence`, `gene/no-exons`, ...), which keeps all kinds globally unique. That lets a
 * single {@link describeError} render any error in the package from one registry, instead of a
 * per-module `describeXError` for every union. Nested causes (a variant carrying `cause`) are
 * rendered by delegating back into {@link describeError}, so a new variant in any inner union never
 * forces an edit anywhere but here.
 *
 * The {@link NucleateError} union and the `makeDescriber<NucleateError>` arms record are kept in
 * lockstep at compile time: omitting a `kind` (missing key) or naming a non-existent one (excess
 * key) fails to type-check, so the registry is provably exhaustive.
 */

import { makeDescriber } from './result/index.js';
import type {
  DNAError,
  RNAError,
  CodonError,
  ReadingFrameError,
  DoubleStrandedError,
} from './sequence/index.js';
import type { RegionError } from './coordinates/index.js';
import type { PatternError } from './pattern/index.js';
import type { GeneError, PromoterError, PromoterElementError } from './gene/index.js';
import type { VariantValidationError } from './variants/index.js';
import type { TranscriptionError } from './transcription/index.js';
import type { SplicingError } from './splicing/index.js';
import type { PolyadenylationError } from './polyadenylation/index.js';
import type { MRNAError } from './modifications/index.js';
import type { ProcessingError, SpliceVariantSelectionError } from './processing/index.js';
import type { TranslationError } from './translation/index.js';
import type {
  RNAPrimerError,
  OkazakiFragmentError,
  ReplicationError,
} from './replication/index.js';

/**
 * Union of every structured error the package can produce. Any specific domain error (e.g.
 * `DNAError`) is assignable to this union, so {@link describeError} accepts them all.
 */
export type NucleateError =
  | DNAError
  | RNAError
  | CodonError
  | ReadingFrameError
  | DoubleStrandedError
  | RegionError
  | PatternError
  | GeneError
  | PromoterError
  | PromoterElementError
  | VariantValidationError
  | TranscriptionError
  | SplicingError
  | PolyadenylationError
  | MRNAError
  | ProcessingError
  | SpliceVariantSelectionError
  | TranslationError
  | RNAPrimerError
  | OkazakiFragmentError
  | ReplicationError;

/**
 * Renders any {@link NucleateError} as a human-readable message. Single source of truth for error
 * text across the package; pass it the `error` from any failed `Result`.
 *
 * @param error - The structured error to render
 * @returns A human-readable description
 *
 * @example
 * ```typescript
 * const result = parseDNA('xyz');
 * if (!result.success) {
 *   console.error(describeError(result.error)); // 'Invalid DNA sequence: ...'
 * }
 * ```
 */
export const describeError: (error: NucleateError) => string = makeDescriber<NucleateError>({
  // sequence/
  'dna/empty-sequence': () => 'DNA sequence cannot be empty',
  'dna/invalid-characters': e =>
    `Invalid DNA sequence: contains invalid characters ${e.chars.join(', ')} (first at index ${e.firstAt})`,
  'rna/empty-sequence': () => 'RNA sequence cannot be empty',
  'rna/invalid-characters': e =>
    `Invalid RNA sequence: contains invalid characters ${e.chars.join(', ')} (first at index ${e.firstAt})`,
  'codon/wrong-codon-length': e => `Codon must be ${e.expected} nucleotides; received ${e.length}`,
  'reading-frame/frame-misaligned': e =>
    `Reading frame error: coding sequence length ${e.codingLength} is not divisible by ${e.codonLength}`,
  'reading-frame/missing-start-codon': e =>
    `Expected start codon AUG at position ${e.position}, found ${e.found}`,
  'double-stranded/length-mismatch': e =>
    `Double-stranded DNA requires equal-length strands; forward is ${e.forwardLength} nt, reverse is ${e.reverseLength} nt`,
  'double-stranded/not-complementary': e =>
    `Strands are not complementary: at forward index ${e.firstMismatchAt} the reverse strand has '${e.actual}' but expected '${e.expected}'`,

  // coordinates/
  'region/negative-start': e => `Region start ${e.start} must be non-negative`,
  'region/negative-end': e => `Region end ${e.end} must be non-negative`,
  'region/start-not-before-end': e =>
    `Region start (${e.start}) must be strictly less than end (${e.end})`,

  // pattern/
  'pattern/empty-pattern': () => 'Nucleotide pattern cannot be empty',
  'pattern/empty-symbol': () => 'Nucleotide pattern symbol cannot be empty',
  'pattern/invalid-iupac-character': e =>
    `Invalid nucleotide pattern character '${e.character}' at index ${e.index}`,
  'pattern/invalid-iupac-symbol': e => `Invalid IUPAC nucleotide symbol: '${e.symbol}'`,
  'pattern/invalid-regex-construction': e =>
    `Invalid nucleotide pattern '${e.pattern}': ${e.cause}`,

  // gene/
  'gene/invalid-sequence': e => `Invalid gene sequence: ${describeError(e.cause)}`,
  'gene/no-exons': () => 'Gene must have at least one exon',
  'gene/exon-invalid-coordinates': e =>
    `Exon ${e.exonIndex} has invalid coordinates: start=${e.start}, end=${e.end}`,
  'gene/exon-out-of-bounds': e =>
    `Exon ${e.exonIndex} extends beyond sequence length: end=${e.exonEnd}, sequence length=${e.sequenceLength}`,
  'gene/exon-too-small': e =>
    `Exon ${e.exonIndex} is too small: ${e.length} bp (minimum ${e.min} bp required)`,
  'gene/exon-too-large': e =>
    `Exon ${e.exonIndex} is unrealistically large: ${e.length} bp (maximum ${e.max} bp)`,
  'gene/exons-overlap': e =>
    `Exon overlap detected at position ${e.at}. Overlapping exons: ${e.indices.join(', ')}`,
  'gene/intron-too-small': e =>
    `Intron ${e.intronIndex} is too small: ${e.length} bp (minimum ${e.min} bp required for proper splicing)`,
  'gene/intron-too-large': e =>
    `Intron ${e.intronIndex} is unrealistically large: ${e.length} bp (maximum ${e.max} bp)`,
  'gene/invalid-splicing-profile': e => e.reason,
  'gene/invalid-variant': e => describeError(e.cause),
  'promoter/invalid-tss': e =>
    `Promoter transcription start site must be a finite non-negative integer; received ${e.tss}`,
  'promoter-element/empty-name': () => 'Promoter element name cannot be empty',
  'promoter-element/invalid-position': e =>
    `Promoter element position must be a finite integer; received ${e.position}`,
  'promoter-element/invalid-score-weight': e =>
    `Promoter element score weight must be a finite number; received ${e.scoreWeight}`,

  // variants/
  'variant/no-included-exons': e => `Variant '${e.variantName}' must include at least one exon`,
  'variant/duplicate-exon-indices': e =>
    `Variant '${e.variantName}' contains duplicate exon indices: ${e.duplicateIndices.join(', ')}`,
  'variant/invalid-exon-index': e =>
    `Variant '${e.variantName}' references invalid exon index ${e.exonIndex}. Gene has ${e.totalExons} exons.`,
  'variant/skips-first-exon': e =>
    `Variant '${e.variantName}' skips the first exon, which is not allowed`,
  'variant/skips-last-exon': e =>
    `Variant '${e.variantName}' skips the last exon, which is not allowed`,
  'variant/below-minimum-exons': e =>
    `Variant '${e.variantName}' includes ${e.included} exons, but minimum required is ${e.minimum}`,
  'variant/not-in-frame': e =>
    `Variant '${e.variantName}' does not maintain reading frame: length ${e.length} is not divisible by 3`,
  'variant/missing-start-codon': e =>
    `Variant '${e.variantName}' does not start with start codon AUG, found '${e.found}'`,
  'variant/missing-stop-codon': e =>
    `Variant '${e.variantName}' does not end with stop codon, found '${e.found}'`,

  // transcription/
  'transcription/invalid-rna-sequence': e => `Invalid pre-mRNA sequence: ${describeError(e.cause)}`,
  'transcription/gene-has-no-exons': () => 'Gene has no exons; cannot determine transcript bounds',
  'transcription/no-promoter-found': e =>
    `No promoter passing minStrength=${e.minStrength} found in gene region [${e.searchedRegion.start}, ${e.searchedRegion.end})`,
  'transcription/tss-not-identifiable': () =>
    'Promoter located but no transcription start site could be derived from its elements',
  'transcription/tss-out-of-bounds': e =>
    `Transcription start site ${e.tss} is outside gene bounds (sequence length ${e.sequenceLength})`,
  'transcription/tss-conflicts-with-exons': e =>
    `TSS at position ${e.tss} conflicts with gene exon structure; exons ${e.conflictingExons.join(', ')} start upstream of the TSS`,

  // splicing/
  'splicing/no-exons': () => 'Cannot splice RNA: no exons found in pre-mRNA',
  'splicing/exon-out-of-bounds': e =>
    `Exon ${e.exonIndex} region ${e.start}-${e.end} is outside transcript bounds (length ${e.sequenceLength})`,
  'splicing/invalid-donor-site': e =>
    `Invalid 5' splice site at transcript position ${e.position}: expected GU, found ${e.found}`,
  'splicing/invalid-acceptor-site': e =>
    `Invalid 3' splice site at transcript position ${e.position}: expected AG, found ${e.found}`,
  'splicing/intron-too-short': e =>
    `Intron ${e.intronIndex} is too short: ${e.length} bp (minimum ${e.min} bp required)`,

  // polyadenylation/
  'polyadenylation/invalid-cleavage-site': e =>
    `Invalid cleavage site ${e.cleavageSite}: must be a non-negative integer`,
  'polyadenylation/invalid-tail-length': e =>
    `Invalid poly-A tail length ${e.tailLength}: must be between 0 and ${e.max}`,
  'polyadenylation/no-poly-a-tail': () => "RNA has no 3' poly-A tail to remove",

  // modifications/ (mrna)
  'mrna/invalid-sequence': e => `Invalid mRNA sequence: ${describeError(e.cause)}`,
  'mrna/invalid-coding-boundaries': e =>
    `Invalid coding-sequence boundaries: start=${e.codingStart}, end=${e.codingEnd}, sequence length=${e.sequenceLength}`,
  'mrna/incomplete-coding-boundaries': e =>
    `Incomplete coding-sequence boundaries (start=${e.codingStart}, end=${e.codingEnd}): a CDS needs both codingStart and codingEnd; supply both for a coding mRNA or neither for a non-coding mRNA`,
  'mrna/invalid-polya-tail-length': e =>
    `Invalid poly-A tail length ${e.polyATailLength}: must be between 0 and the sequence length (${e.sequenceLength})`,

  // processing/
  'processing/splicing-failed': e => `Splicing failed: ${describeError(e.cause)}`,
  'processing/no-start-codon': () => 'No start codon (AUG) found in spliced sequence',
  'processing/no-in-frame-stop': () => 'No in-frame stop codon found after start codon',
  'processing/polyadenylation-failed': e => `Polyadenylation failed: ${describeError(e.cause)}`,
  'splice-selection/no-splicing-profile': () =>
    'Gene does not have an alternative splicing profile',
  'splice-selection/no-default-variant': () =>
    'Gene does not have a default splice variant defined',

  // translation/
  'translation/invalid-codon-sequence': e =>
    `Invalid codon '${e.codon}': ${describeError(e.cause)}`,
  'translation/invalid-codon-length': e =>
    `Invalid codon '${e.codon}': length ${e.length} (expected ${e.expected})`,
  'translation/stop-codon': e =>
    `Codon '${e.codon}' is a stop codon and does not code for an amino acid`,
  'translation/invalid-codon': e =>
    `Codon '${e.codon}' at position ${e.position} does not code for any amino acid`,
  'translation/invalid-reading-frame': e =>
    `Coding sequence length ${e.codingLength} is not a multiple of codon length ${e.codonLength}`,
  'translation/no-coding-sequence': () => 'mRNA has no coding sequence to translate',

  // replication/
  'primer/invalid-position': e =>
    `RNA primer position must be a non-negative integer; received ${e.position}`,
  'primer/invalid-sequence': e => `Invalid RNA primer sequence: ${describeError(e.cause)}`,
  'primer/invalid-length': e =>
    `RNA primers must be ${e.min}-${e.max} nucleotides; received length ${e.length}`,
  'okazaki/empty-id': () => 'Okazaki fragment id cannot be empty',
  'okazaki/invalid-position': e =>
    `Okazaki fragment ${e.field} must be a non-negative integer; received ${e.position}`,
  'okazaki/invalid-range': e =>
    `Okazaki fragment endPosition (${e.endPosition}) must be strictly greater than startPosition (${e.startPosition})`,
  'okazaki/primer-position-mismatch': e =>
    `RNA primer position (${e.primerPosition}) must equal fragment startPosition (${e.startPosition})`,
  'okazaki/sequence-length-mismatch': e =>
    `Okazaki fragment sequence length (${e.sequenceLength}) must equal range length (${e.expectedLength})`,
  'replication/template-too-short': e =>
    `Template length ${e.length} bp is below the minimum ${e.minimum} bp required for replication on the chosen organism`,
});
