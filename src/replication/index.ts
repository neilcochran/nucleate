/**
 * DNA replication domain: pure-function replication simulation, immutable Okazaki fragments
 * and RNA primers, organism profiles, and structured error variants.
 *
 * Okazaki fragments are modeled as a tagged union of four lifecycle phases (`PrimerOnly`,
 * `Synthesized`, `PrimerRemoved`, `Ligated`) discriminated by the `phase` field. Public
 * callers construct fragments via the four `parse*Fragment` parsers; the module-internal
 * `unsafe*Fragment` factories and `synthesize` / `removePrimer` / `ligate` phase-transition
 * functions are deliberately excluded from this barrel. Other code under `src/` can import
 * them from `./OkazakiFragment.js` when it can prove the inputs are well-formed; package
 * consumers cannot reach them.
 *
 * Replication-specific biological constants (primer length bounds) live inline at
 * `./biology.js` and are not re-exported here; they are implementation details
 * of the simulation rather than part of its public surface.
 */
export type {
  OkazakiFragment,
  PrimerOnlyFragment,
  SynthesizedFragment,
  PrimerRemovedFragment,
  LigatedFragment,
} from './OkazakiFragment.js';
export {
  parsePrimerOnlyFragment,
  parseSynthesizedFragment,
  parsePrimerRemovedFragment,
  parseLigatedFragment,
  fragmentLength,
  isComplete,
} from './OkazakiFragment.js';
export type { RNAPrimer } from './RNAPrimer.js';
export { parseRNAPrimer } from './RNAPrimer.js';
export { replicate, replicateSteps, type ReplicationOptions } from './replicate.js';
export type {
  ReplicationEvent,
  ReplicationEventKind,
  ReplicationOutput,
  ReplicationSnapshot,
  ReplicationStatistics,
} from './events.js';
export type { OrganismProfile } from './organism-profiles.js';
export { E_COLI, HUMAN } from './organism-profiles.js';
export type { RNAPrimerError, OkazakiFragmentError, ReplicationError } from './errors.js';
