import type { DoubleStrandedDNA } from '../sequence/index.js';
import type { OkazakiFragment } from './OkazakiFragment.js';

/**
 * Discriminator for the kind of molecular activity narrated by a {@link ReplicationEvent}.
 *
 * - `unwind`: helicase separates the parental duplex over a stretch of base pairs.
 * - `leading-synthesis`: DNA polymerase III continuously synthesizes the leading strand.
 * - `primer-synthesis`: primase lays down the RNA primer that initiates an Okazaki fragment.
 * - `lagging-synthesis`: DNA polymerase III fills the Okazaki fragment with DNA following
 *   the primer.
 * - `primer-removal`: 5'-to-3' exonuclease excises the RNA primer from a completed Okazaki
 *   fragment.
 * - `ligation`: DNA ligase seals an Okazaki fragment to its 5'-adjacent fragment.
 */
export type ReplicationEventKind =
  | 'unwind'
  | 'leading-synthesis'
  | 'primer-synthesis'
  | 'lagging-synthesis'
  | 'primer-removal'
  | 'ligation';

/**
 * A single molecular event in the simulated replication timeline.
 *
 * Events are immutable and deeply readonly. Together, the ordered event list returned in a
 * {@link ReplicationOutput} narrates the full progression of the fork. Each event references
 * the position (relative to the parent template, 0-based) at which it occurred and the
 * strand it affected; lagging-strand events additionally carry a `fragmentId` referring to
 * the {@link OkazakiFragment} they target.
 */
export interface ReplicationEvent {
  /** Discriminator naming the molecular activity. */
  readonly kind: ReplicationEventKind;

  /** 0-based position on the parental template where the event begins. */
  readonly position: number;

  /**
   * Which strand the event affects. `'leading'` for continuous synthesis; `'lagging'` for
   * Okazaki-fragment events; `'both'` for events that touch both strands (helicase unwinding).
   */
  readonly strand: 'leading' | 'lagging' | 'both';

  /**
   * Number of base pairs touched by this event. For synthesis events, the number of
   * nucleotides incorporated; for `primer-removal`, the number of nucleotides excised; for
   * `ligation`, always zero (sealing a phosphodiester bond does not change the base-pair
   * count).
   */
  readonly basePairs: number;

  /**
   * Identifier of the {@link OkazakiFragment} the event targets. Present on every lagging-
   * strand event; absent on leading-strand and unwind events.
   */
  readonly fragmentId?: string;
}

/**
 * Snapshot of the replication state at one step of the simulation.
 *
 * Yielded by {@link replicateSteps}. Each snapshot is immutable; consumers visualizing the
 * simulation can render snapshots without worrying about mutation invalidating prior frames.
 * The {@link fragments} list reflects the lifecycle phases reached by the various Okazaki
 * fragments at this point in the run; individual fragments may be in any of the four
 * `phase` values (`'primer-only'`, `'synthesized'`, `'primer-removed'`, `'ligated'`).
 */
export interface ReplicationSnapshot {
  /** 0-based step index within the iterator's stream. */
  readonly step: number;

  /** Current position of the replication fork on the parental template. */
  readonly forkPosition: number;

  /** Number of leading-strand base pairs synthesized so far. */
  readonly leadingStrandSynthesized: number;

  /**
   * Okazaki fragments seen so far. Each fragment carries its current lifecycle `phase`
   * discriminator and the phase-specific fields (notably `sequence`, present on every phase
   * except `'primer-only'`).
   */
  readonly fragments: readonly OkazakiFragment[];

  /**
   * The event emitted at this step. Absent on the initial snapshot (step 0, before any
   * molecular activity has begun).
   */
  readonly lastEvent?: ReplicationEvent;
}

/**
 * Final output of a successful {@link replicate} run.
 *
 * The two {@link ReplicationOutput.daughters | daughters} are semiconservative products of the
 * parental duplex. {@link ReplicationOutput.daughters | daughters[0]} retains the parental
 * forward strand by reference and pairs it with a freshly-allocated reverse strand;
 * {@link ReplicationOutput.daughters | daughters[1]} retains the parental reverse strand by
 * reference and pairs it with a freshly-allocated forward strand. At the sequence level both
 * daughters are equal to the parent; the {@link ReplicationOutput.events | events} log
 * narrates how each new strand was built.
 *
 * Model scope: this is the output of a single-fork, linear-template simulation. {@link replicate}
 * models one unidirectional fork with no origin firing, no bidirectional or multiple forks, and
 * no circular templates - even for biologically circular genomes such as `E_COLI`. The two
 * daughters are nonetheless the correct semiconservative products, which holds for any fork count.
 */
export interface ReplicationOutput {
  /**
   * The two daughter duplexes produced by replication. Both are sequence-equal to the
   * parental duplex; they differ in which parental strand each retains by reference (the
   * other strand of each daughter is freshly allocated).
   */
  readonly daughters: readonly [DoubleStrandedDNA, DoubleStrandedDNA];

  /** Ordered timeline of molecular events that occurred during the simulation. */
  readonly events: readonly ReplicationEvent[];

  /** Summary statistics aggregated from the events. */
  readonly statistics: ReplicationStatistics;
}

/**
 * Aggregate statistics over a {@link ReplicationOutput}.
 */
export interface ReplicationStatistics {
  /** Total number of simulation steps executed (each step emits at most one event). */
  readonly totalSteps: number;

  /** Number of base pairs synthesized on the leading strand (always equals the template length). */
  readonly leadingStrandLength: number;

  /** Number of base pairs synthesized on the lagging strand (always equals the template length). */
  readonly laggingStrandLength: number;

  /** Total number of Okazaki fragments produced during the run. */
  readonly okazakiFragmentCount: number;

  /**
   * Mean fragment size in base pairs. Returns `0` when no fragments were produced (which
   * only happens for templates shorter than the chosen organism's smallest fragment size).
   */
  readonly averageOkazakiFragmentSize: number;

  /**
   * Simulated wall-clock time for the run, computed as
   * `templateLength / organism.polymeraseSpeed`. This is the time the leading-strand
   * polymerase would take to traverse the template at its base speed; it ignores per-event
   * overheads, fragment-level parallelism, and the slower processing-enzyme speeds.
   */
  readonly simulatedTimeSeconds: number;
}
