/**
 * mRNA-modification domain types: the {@link MRNA} composition-based mature-mRNA class with
 * its 5'-cap and poly-A tail metadata methods, the {@link parseMRNA} parser, and the
 * {@link MRNAError} tagged union for the construction-time `parseMRNA` failures.
 *
 * The `processRNA` / `processSpliced` pipeline that produces an `MRNA` from a pre-mRNA lives in
 * `processing/`, which re-uses `MRNAError` as the construction-time subset of its
 * `ProcessingError` union.
 *
 * `MRNA` is exported as a type only, so construction is reachable only through `parseMRNA` (or
 * the `processing/` pipeline). The module-private `unsafeMRNA` factory is likewise excluded from
 * this barrel.
 */
export type { MRNA } from './MRNA.js';
export { parseMRNA } from './parse.js';
export type { MRNAError } from './errors.js';
