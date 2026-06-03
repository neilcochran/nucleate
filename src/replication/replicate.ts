import { Result, success, failure, at } from '../result/index.js';
import type { DoubleStrandedDNA } from '../sequence/index.js';
import { unsafeDNA } from '../sequence/DNA.js';
import { unsafeDoubleStrandedDNA } from '../sequence/DoubleStrandedDNA.js';
import type {
  ReplicationEvent,
  ReplicationOutput,
  ReplicationSnapshot,
  ReplicationStatistics,
} from './events.js';
import {
  fragmentLength,
  ligate,
  removePrimer,
  synthesize,
  unsafePrimerOnlyFragment,
  type OkazakiFragment,
} from './OkazakiFragment.js';
import { unsafeRNAPrimerFromString } from './RNAPrimer.js';
import type { ReplicationError } from './errors.js';
import { E_COLI, type OrganismProfile } from './organism-profiles.js';

/**
 * Configuration passed to {@link replicate} and {@link replicateSteps}.
 *
 * Both fields are optional. By default the simulation uses the {@link E_COLI} organism
 * profile and `Math.random` for the RNG. Tests inject a seeded RNG (any `() => number`
 * function returning values in `[0, 1)`) for deterministic fragment sizing and primer
 * content; the simulation never reads the global random source directly.
 */
export interface ReplicationOptions {
  /** Organism profile providing kinetic and structural parameters. Defaults to E. coli. */
  readonly organism?: OrganismProfile;

  /**
   * Source of randomness for fragment sizing and primer synthesis. Should return values in
   * `[0, 1)`. Defaults to `Math.random`.
   */
  readonly rng?: () => number;
}

/** RNA nucleotides used by the simulation when synthesizing primer sequences. */
const RNA_BASES = ['A', 'U', 'G', 'C'] as const;

/**
 * Simulates DNA replication of a {@link DoubleStrandedDNA} template, producing two daughter
 * duplexes and a full timeline of molecular events.
 *
 * The simulation models a single replication fork advancing from position 0 toward the end
 * of the template. The leading strand is synthesized continuously; the lagging strand is
 * synthesized as a sequence of Okazaki fragments whose sizes are drawn (using the supplied
 * RNG) from the organism's `fragmentSize` range. Each fragment is initiated by an RNA primer
 * of a length drawn from the organism's `primerLength` range; the primer is later excised by
 * exonuclease and the gap sealed by ligase.
 *
 * Output follows the semiconservative model: each daughter duplex retains one of the
 * parental strands by reference and pairs it with a freshly-allocated complementary strand
 * representing the newly synthesized DNA. {@link ReplicationOutput.daughters | daughters[0]}
 * keeps the parental forward strand; {@link ReplicationOutput.daughters | daughters[1]} keeps
 * the parental reverse strand. The event log narrates how each new strand was built.
 *
 * Model scope (single-fork simplification): this simulates exactly one unidirectional replication
 * fork on a linear template. It does not model origin firing, bidirectional forks, multiple
 * origins with fork fusion, or circular templates. Even for organism profiles whose genome is
 * biologically circular (e.g. `E_COLI`), the template is treated as linear and replicated by a
 * single fork. A richer origin- and fork-aware model is future work.
 *
 * @param template - The parental duplex to replicate
 * @param options - Optional organism profile and RNG
 * @returns `Result.success` containing a {@link ReplicationOutput} when the template is long
 * enough to host at least one RNA primer; `Result.failure` carrying a {@link ReplicationError}
 * otherwise
 *
 * @example
 * ```typescript
 * const parent = doubleStrandedDNA(parseDNA('ATCGATCGATCG').unwrap());
 * const result = replicate(parent);
 * if (result.success) {
 *   const { daughters, events, statistics } = result.data;
 *   daughters[0].forward.sequence === parent.forward.sequence; // true
 * }
 * ```
 */
export function replicate(
  template: DoubleStrandedDNA,
  options?: ReplicationOptions,
): Result<ReplicationOutput, ReplicationError> {
  const planResult = buildPlan(template, options);
  if (planResult.success === false) {
    return failure(planResult.error);
  }
  const plan = planResult.data;

  // Drive the same step-by-step simulation `replicateSteps` exposes, accumulating the event
  // timeline and the final (fully-ligated) fragment set from the snapshots it yields. Keeping the
  // lifecycle walk in `simulate` alone means the eager and step-by-step entry points cannot drift.
  const events: ReplicationEvent[] = [];
  let finalFragments: readonly OkazakiFragment[] = [];
  let leadingStrandSynthesized = 0;
  for (const snapshot of simulate(plan)) {
    if (snapshot.lastEvent !== undefined) {
      events.push(snapshot.lastEvent);
    }
    finalFragments = snapshot.fragments;
    leadingStrandSynthesized = snapshot.leadingStrandSynthesized;
  }

  const daughters = buildDaughters(template);
  const statistics = computeStatistics({
    totalSteps: events.length,
    templateLength: plan.templateLength,
    leadingStrandLength: leadingStrandSynthesized,
    fragments: finalFragments,
    organism: plan.organism,
  });

  return success({
    daughters,
    events: Object.freeze(events),
    statistics,
  });
}

/**
 * Simulates DNA replication step by step, yielding an immutable snapshot of the replication
 * state after each molecular event.
 *
 * Validation runs up-front: a {@link ReplicationError} (e.g. template too short for the
 * chosen organism) appears on the failure branch before any snapshot is produced. The success
 * branch carries a {@link Generator} that yields {@link ReplicationSnapshot} values.
 *
 * The first yielded snapshot represents the initial state (step 0, no events yet). Each
 * subsequent snapshot corresponds to one molecular event.
 *
 * @param template - The parental duplex to replicate
 * @param options - Optional organism profile and RNG
 * @returns `Result.success` carrying a snapshot generator, or `Result.failure` with a
 * {@link ReplicationError}
 *
 * @example
 * ```typescript
 * const parent = doubleStrandedDNA(parseDNA('ATCGATCGATCG').unwrap());
 * const stepsResult = replicateSteps(parent);
 * if (stepsResult.success) {
 *   for (const snapshot of stepsResult.data) {
 *     console.log(snapshot.step, snapshot.lastEvent?.kind);
 *   }
 * }
 * ```
 */
export function replicateSteps(
  template: DoubleStrandedDNA,
  options?: ReplicationOptions,
): Result<Generator<ReplicationSnapshot, void, void>, ReplicationError> {
  const planResult = buildPlan(template, options);
  if (planResult.success === false) {
    return failure(planResult.error);
  }
  return success(simulate(planResult.data));
}

function* simulate(plan: ReplicationPlan): Generator<ReplicationSnapshot, void, void> {
  let step = 0;
  const fragments: OkazakiFragment[] = [];
  let forkPosition = 0;
  let leadingStrandSynthesized = 0;

  yield freezeSnapshot({
    step: step++,
    forkPosition,
    leadingStrandSynthesized,
    fragments: [...fragments],
  });

  for (const fragmentPlan of plan.fragmentPlans) {
    const fragmentSpan = fragmentPlan.endPosition - fragmentPlan.startPosition;
    forkPosition = fragmentPlan.endPosition;

    yield freezeSnapshot({
      step: step++,
      forkPosition,
      leadingStrandSynthesized,
      fragments: [...fragments],
      lastEvent: {
        kind: 'unwind',
        position: fragmentPlan.startPosition,
        strand: 'both',
        basePairs: fragmentSpan,
      },
    });

    leadingStrandSynthesized += fragmentSpan;
    yield freezeSnapshot({
      step: step++,
      forkPosition,
      leadingStrandSynthesized,
      fragments: [...fragments],
      lastEvent: {
        kind: 'leading-synthesis',
        position: fragmentPlan.startPosition,
        strand: 'leading',
        basePairs: fragmentSpan,
      },
    });

    const primer = unsafeRNAPrimerFromString(
      fragmentPlan.primerSequence,
      fragmentPlan.startPosition,
    );
    fragments.push(
      unsafePrimerOnlyFragment(
        fragmentPlan.id,
        fragmentPlan.startPosition,
        fragmentPlan.endPosition,
        primer,
      ),
    );
    yield freezeSnapshot({
      step: step++,
      forkPosition,
      leadingStrandSynthesized,
      fragments: [...fragments],
      lastEvent: {
        kind: 'primer-synthesis',
        position: fragmentPlan.startPosition,
        strand: 'lagging',
        basePairs: primer.length(),
        fragmentId: fragmentPlan.id,
      },
    });

    const fragmentSequence = unsafeDNA(fragmentPlan.synthesizedDNA);
    const lastIndex = fragments.length - 1;
    const lastFragment = at(fragments, lastIndex);
    if (lastFragment.phase !== 'primer-only') {
      throw new Error(
        `Expected primer-only fragment at index ${lastIndex} during lagging-synthesis step, got phase ${lastFragment.phase}`,
      );
    }
    fragments[lastIndex] = synthesize(lastFragment, fragmentSequence);
    yield freezeSnapshot({
      step: step++,
      forkPosition,
      leadingStrandSynthesized,
      fragments: [...fragments],
      lastEvent: {
        kind: 'lagging-synthesis',
        position: fragmentPlan.startPosition,
        strand: 'lagging',
        basePairs: fragmentSpan,
        fragmentId: fragmentPlan.id,
      },
    });
  }

  for (let i = 0; i < fragments.length; i++) {
    const fragment = at(fragments, i);
    if (fragment.phase !== 'synthesized') {
      throw new Error(
        `Expected synthesized fragment at index ${i} during primer-removal pass, got phase ${fragment.phase}`,
      );
    }
    fragments[i] = removePrimer(fragment);
    yield freezeSnapshot({
      step: step++,
      forkPosition,
      leadingStrandSynthesized,
      fragments: [...fragments],
      lastEvent: {
        kind: 'primer-removal',
        position: fragment.startPosition,
        strand: 'lagging',
        basePairs: fragment.primer.length(),
        fragmentId: fragment.id,
      },
    });
  }

  for (let i = 0; i < fragments.length; i++) {
    const fragment = at(fragments, i);
    if (fragment.phase !== 'primer-removed') {
      throw new Error(
        `Expected primer-removed fragment at index ${i} during ligation pass, got phase ${fragment.phase}`,
      );
    }
    fragments[i] = ligate(fragment);
    yield freezeSnapshot({
      step: step++,
      forkPosition,
      leadingStrandSynthesized,
      fragments: [...fragments],
      lastEvent: {
        kind: 'ligation',
        position: fragment.startPosition,
        strand: 'lagging',
        basePairs: 0,
        fragmentId: fragment.id,
      },
    });
  }
}

interface FragmentPlan {
  readonly id: string;
  readonly startPosition: number;
  readonly endPosition: number;
  readonly primerSequence: string;
  readonly synthesizedDNA: string;
}

interface ReplicationPlan {
  readonly templateLength: number;
  readonly organism: OrganismProfile;
  readonly fragmentPlans: readonly FragmentPlan[];
}

function buildPlan(
  template: DoubleStrandedDNA,
  options?: ReplicationOptions,
): Result<ReplicationPlan, ReplicationError> {
  const organism = options?.organism ?? E_COLI;
  const rng = options?.rng ?? Math.random;
  const templateLength = template.forward.sequence.length;
  const minimum = organism.primerLength[1];

  if (templateLength < minimum) {
    return failure({ kind: 'replication/template-too-short', length: templateLength, minimum });
  }

  const laggingTemplate = template.forward.sequence;
  const fragmentPlans: FragmentPlan[] = [];
  let cursor = 0;
  let fragmentCounter = 0;

  while (cursor < templateLength) {
    const remaining = templateLength - cursor;
    const targetSize = randomInRange(rng, organism.fragmentSize[0], organism.fragmentSize[1]);
    const fragmentSize = Math.min(targetSize, remaining);
    const startPosition = cursor;
    const endPosition = cursor + fragmentSize;
    const primerLength = randomInRange(rng, organism.primerLength[0], organism.primerLength[1]);
    const primerSequence = randomRNASequence(rng, primerLength);
    const synthesizedDNA = unsafeDNA(
      laggingTemplate.substring(startPosition, endPosition),
    ).getComplement().sequence;

    fragmentPlans.push({
      id: `okazaki-${++fragmentCounter}`,
      startPosition,
      endPosition,
      primerSequence,
      synthesizedDNA,
    });

    cursor = endPosition;
  }

  return success({ templateLength, organism, fragmentPlans });
}

function buildDaughters(
  template: DoubleStrandedDNA,
): readonly [DoubleStrandedDNA, DoubleStrandedDNA] {
  const newReverseStrand = unsafeDNA(template.reverse.sequence);
  const newForwardStrand = unsafeDNA(template.forward.sequence);
  const daughter1 = unsafeDoubleStrandedDNA(template.forward, newReverseStrand);
  const daughter2 = unsafeDoubleStrandedDNA(newForwardStrand, template.reverse);
  return [daughter1, daughter2];
}

function computeStatistics(input: {
  totalSteps: number;
  templateLength: number;
  leadingStrandLength: number;
  fragments: readonly OkazakiFragment[];
  organism: OrganismProfile;
}): ReplicationStatistics {
  const fragmentLengths = input.fragments.map(f => fragmentLength(f));
  const totalFragmentSize = fragmentLengths.reduce((sum, length) => sum + length, 0);
  const averageOkazakiFragmentSize =
    fragmentLengths.length === 0 ? 0 : totalFragmentSize / fragmentLengths.length;
  const simulatedTimeSeconds = input.templateLength / input.organism.polymeraseSpeed;
  return {
    totalSteps: input.totalSteps,
    leadingStrandLength: input.leadingStrandLength,
    laggingStrandLength: totalFragmentSize,
    okazakiFragmentCount: fragmentLengths.length,
    averageOkazakiFragmentSize,
    simulatedTimeSeconds,
  };
}

function randomInRange(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomRNASequence(rng: () => number, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    // rng() is contracted to [0, 1), so the index is always in [0, RNA_BASES.length).
    result += at(RNA_BASES, Math.floor(rng() * RNA_BASES.length));
  }
  return result;
}

function freezeEvent(event: ReplicationEvent): ReplicationEvent {
  return Object.freeze({ ...event });
}

function freezeSnapshot(snapshot: {
  step: number;
  forkPosition: number;
  leadingStrandSynthesized: number;
  fragments: OkazakiFragment[];
  lastEvent?: ReplicationEvent;
}): ReplicationSnapshot {
  const frozen: ReplicationSnapshot = {
    step: snapshot.step,
    forkPosition: snapshot.forkPosition,
    leadingStrandSynthesized: snapshot.leadingStrandSynthesized,
    fragments: Object.freeze([...snapshot.fragments]),
    lastEvent: snapshot.lastEvent === undefined ? undefined : freezeEvent(snapshot.lastEvent),
  };
  return Object.freeze(frozen);
}
