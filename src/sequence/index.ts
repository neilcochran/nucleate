/**
 * Sequence-level primitives: validated `DNA` / `RNA` sequence types, the `DoubleStrandedDNA`
 * duplex, parsers, complement helpers, sequence-level transcription / reverse-transcription,
 * and codon primitives.
 *
 * The `DNA` / `RNA` / `DoubleStrandedDNA` classes are exported as types only, so construction
 * is reachable only through the parsers below. The module-private `unsafeDNA` / `unsafeRNA` /
 * `unsafeDoubleStrandedDNA` factories are likewise excluded from this barrel; other code under
 * `src/` may import them (and the class values) from `./DNA.js` / `./RNA.js` /
 * `./DoubleStrandedDNA.js` when it can prove the input is well-formed; package consumers cannot
 * reach them.
 */
export type { DNA } from './DNA.js';
export type { RNA } from './RNA.js';
export type { DoubleStrandedDNA } from './DoubleStrandedDNA.js';
export { parseDNA, parseRNA, parseDoubleStrandedDNA, doubleStrandedDNA } from './parse.js';
export { complement, reverseComplement } from './complement.js';
export { transcribeSequence, reverseTranscribeSequence } from './conversion.js';
export {
  CODON_LENGTH,
  START_CODON,
  STOP_CODONS,
  isStopCodon,
  validateReadingFrame,
  parseCodon,
} from './codons.js';
export type { StopCodon, Codon } from './codons.js';
export type {
  DNAError,
  RNAError,
  ReadingFrameError,
  DoubleStrandedError,
  CodonError,
} from './errors.js';
