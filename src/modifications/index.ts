/**
 * mRNA-modification domain types: the {@link MRNA} composition-based mature-mRNA class with
 * its 5'-cap and poly-A tail metadata methods, the {@link parseMRNA} parser, the
 * {@link processRNA} pipeline that orchestrates splicing + polyadenylation + cap/tail
 * application to produce a mature mRNA, the {@link processSpliced} helper that runs the
 * post-splicing portion only (useful for variant-driven splicing flows), and the
 * structured-error tagged unions ({@link MRNAError} for the construction-time `parseMRNA`
 * failures, {@link ProcessingError} for the full `processRNA` pipeline including splicing /
 * codon-detection stages; every `MRNAError` is also a `ProcessingError`).
 *
 * `MRNA` is exported as a type only, so construction is reachable only through `parseMRNA` /
 * `processRNA`. The module-private `unsafeMRNA` factory is likewise excluded from this barrel.
 */
export type { MRNA } from './MRNA.js';
export { parseMRNA } from './parse.js';
export { processRNA, processSpliced, DEFAULT_RNA_PROCESSING_OPTIONS } from './process-rna.js';
export type { RNAProcessingOptions } from './process-rna.js';
export type { MRNAError, ProcessingError } from './errors.js';
export { describeMRNAError, describeProcessingError } from './errors.js';
