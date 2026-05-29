/**
 * Polyadenylation domain types: the recognition/scoring helpers
 * (`findPolyadenylationSites`, `getStrongestPolyadenylationSite`,
 * `filterPolyadenylationSites`), the RNA-sequence-level poly-A tail helpers
 * (`add3PrimePolyATail`, `add3PrimePolyATailAtSite`, `remove3PrimePolyATail`,
 * `has3PrimePolyATail`, `get3PrimePolyATailLength`, `getCoreSequence`), the
 * {@link PolyadenylationSite} / {@link CleavageSiteOptions} configuration shapes, the biology
 * constants describing what cells do, the tunable scoring constants describing how the
 * analyzer ranks sites, and the {@link PolyadenylationError} tagged union.
 */
export {
  findPolyadenylationSites,
  getStrongestPolyadenylationSite,
  filterPolyadenylationSites,
} from './polyadenylation.js';
export { DEFAULT_CLEAVAGE_OPTIONS } from './polyadenylation-site.js';
export type { PolyadenylationSite, CleavageSiteOptions } from './polyadenylation-site.js';
export {
  add3PrimePolyATail,
  add3PrimePolyATailAtSite,
  remove3PrimePolyATail,
  has3PrimePolyATail,
  get3PrimePolyATailLength,
  getCoreSequence,
} from './tail.js';
export {
  DEFAULT_POLY_A_TAIL_LENGTH,
  MIN_POLY_A_DETECTION_LENGTH,
  MAX_POLY_A_TAIL_LENGTH,
  POLY_A_TAIL_PATTERN,
  POLYA_SIGNAL_OFFSET,
  CANONICAL_POLYA_SIGNAL_DNA,
  POLYA_SIGNALS,
  DEFAULT_POLYA_SIGNALS,
  DEFAULT_UPSTREAM_USE_PATTERN,
  DEFAULT_DOWNSTREAM_DSE_PATTERN,
  DEFAULT_CLEAVAGE_PREFERENCE,
  DEFAULT_CLEAVAGE_DISTANCE_RANGE,
} from './biology.js';
export {
  DEFAULT_POLYA_SIGNAL_STRENGTH,
  DEFAULT_CLEAVAGE_OFFSET,
  MIN_RNA_SEQUENCE_FOR_POLYA_SEARCH,
  USE_ELEMENT_MAX_BOOST,
  DSE_ELEMENT_MAX_BOOST,
  MIN_POLYA_SITE_STRENGTH,
} from './tuning.js';
export type { PolyadenylationError } from './errors.js';
export { describePolyadenylationError } from './errors.js';
