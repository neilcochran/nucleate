/**
 * Transcription-level domain types: the `transcribe` pipeline, the `PreMRNA` composition-based
 * type and its parser, promoter recognition + TSS identification, and the
 * `TranscriptionError` tagged union.
 *
 * The module-private `unsafePreMRNA` factory and the `UNSAFE_PREMRNA_KEY` symbol are
 * deliberately excluded from this barrel.
 */
export { PreMRNA } from './PreMRNA.js';
export { parsePreMRNA } from './parse.js';
export { transcribe } from './transcribe.js';
export type { TranscriptionOptions } from './transcribe.js';
export { findPromoters, identifyTSS } from './promoter-recognition.js';
export type { PromoterSearchOptions } from './promoter-recognition.js';
export type { TranscriptionError } from './errors.js';
export { describeTranscriptionError } from './errors.js';
export {
  MAX_PROMOTER_SEARCH_DISTANCE,
  DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE,
  DEFAULT_DOWNSTREAM_SEARCH_DISTANCE,
  TSS_PROXIMITY_THRESHOLD,
  DEFAULT_MIN_PROMOTER_STRENGTH,
} from './tuning.js';
