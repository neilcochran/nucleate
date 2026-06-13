/**
 * Transcription-level domain types: the `transcribe` pipeline, the `PreMRNA` composition-based
 * type and its parser, promoter recognition + TSS identification, and the
 * `TranscriptionError` tagged union.
 *
 * `PreMRNA` is exported as a type only, so construction is reachable only through
 * `parsePreMRNA` / `transcribe`. The module-private `unsafePreMRNA` factory is likewise
 * excluded from this barrel.
 */
export type { PreMRNA } from './PreMRNA.js';
export { parsePreMRNA } from './parse.js';
export { transcribe } from './transcribe.js';
export type { TranscriptionOptions } from './transcribe.js';
export { findPromoters, identifyTSS } from './promoter-recognition.js';
export type { PromoterSearchOptions } from './promoter-recognition.js';
export type { TranscriptionError } from './errors.js';
export {
  MAX_PROMOTER_SEARCH_DISTANCE,
  DEFAULT_MAX_PROMOTER_SEARCH_DISTANCE,
  DEFAULT_DOWNSTREAM_SEARCH_DISTANCE,
  TSS_PROXIMITY_THRESHOLD,
  DEFAULT_MIN_PROMOTER_STRENGTH,
} from './tuning.js';
