import { Result, success, failure } from '../result/index.js';
import type { DNA } from '../sequence/index.js';
import type { RNAPrimer } from './RNAPrimer.js';
import type { OkazakiFragmentError } from './errors.js';

/**
 * Shared structural fields carried by every {@link OkazakiFragment} phase.
 *
 * Not exported on its own; the four phase-specific interfaces extend this base and add the
 * `phase` discriminator plus the phase-specific lifecycle fields (`sequence` on the three
 * post-synthesis phases).
 */
interface OkazakiFragmentBase {
  /**
   * Stable identifier for cross-referencing events that target this fragment. Unique within
   * the output of a single `replicate` / `replicateSteps` call; not guaranteed unique across
   * separate calls (a fresh counter starts each call).
   */
  readonly id: string;

  /** 0-based start position on the lagging-strand template (inclusive). */
  readonly startPosition: number;

  /** 0-based end position on the lagging-strand template (exclusive). */
  readonly endPosition: number;

  /** The RNA primer that initiated synthesis of this fragment. */
  readonly primer: RNAPrimer;

  /**
   * Type-level brand. Not present at runtime. Prevents arbitrary `{ phase, id, ... }` object
   * literals from satisfying the {@link OkazakiFragment} union; legitimate fragments are
   * produced by the `parse*Fragment` parsers or the module-internal `unsafe*Fragment`
   * factories.
   */
  readonly __brand: 'OkazakiFragment';
}

/**
 * An Okazaki fragment in its initial phase: an RNA primer has been laid down on the
 * lagging-strand template, but DNA polymerase has not yet filled in the fragment.
 */
export type PrimerOnlyFragment = OkazakiFragmentBase & {
  /** Discriminator naming the lifecycle phase. */
  readonly phase: 'primer-only';
};

/**
 * An Okazaki fragment after DNA polymerase III has filled in the lagging-strand DNA. The
 * RNA primer is still attached at the 5' end.
 */
export type SynthesizedFragment = OkazakiFragmentBase & {
  /** Discriminator naming the lifecycle phase. */
  readonly phase: 'synthesized';
  /** Newly-synthesized DNA filling the fragment. */
  readonly sequence: DNA;
};

/**
 * An Okazaki fragment after 5'-to-3' exonuclease has excised the RNA primer and the gap has
 * been filled with DNA. The fragment now consists of pure DNA but is not yet joined to its
 * 5'-adjacent fragment.
 */
export type PrimerRemovedFragment = OkazakiFragmentBase & {
  /** Discriminator naming the lifecycle phase. */
  readonly phase: 'primer-removed';
  /** DNA filling the fragment. */
  readonly sequence: DNA;
};

/**
 * An Okazaki fragment after DNA ligase has sealed the phosphodiester bond joining it to its
 * 5'-adjacent fragment. Terminal lifecycle phase.
 */
export type LigatedFragment = OkazakiFragmentBase & {
  /** Discriminator naming the lifecycle phase. */
  readonly phase: 'ligated';
  /** DNA filling the fragment. */
  readonly sequence: DNA;
};

/**
 * An immutable Okazaki fragment - a short stretch of newly synthesized DNA on the lagging
 * strand, initiated by an RNA primer.
 *
 * Modeled as a tagged union of four lifecycle phases discriminated by the `phase` field.
 * Narrow with `fragment.phase === '...'` to access phase-specific fields (notably
 * `sequence`, which is absent on {@link PrimerOnlyFragment}).
 *
 * Public callers construct fragments via the four `parse*Fragment` functions. The event log
 * returned by `replicate` narrates the state transitions; snapshots yielded by
 * `replicateSteps` carry fragments at varying lifecycle phases.
 */
export type OkazakiFragment =
  | PrimerOnlyFragment
  | SynthesizedFragment
  | PrimerRemovedFragment
  | LigatedFragment;

/**
 * Returns the length of an Okazaki fragment in base pairs (`endPosition - startPosition`).
 *
 * @param fragment - The fragment to measure
 * @returns Length in base pairs
 */
export function fragmentLength(fragment: OkazakiFragment): number {
  return fragment.endPosition - fragment.startPosition;
}

/**
 * Type predicate identifying a fragment in its terminal lifecycle phase (DNA synthesized,
 * primer removed, ligated to neighbor).
 *
 * @param fragment - The fragment to test
 * @returns `true` if `fragment.phase === 'ligated'`; narrows `fragment` to {@link LigatedFragment}
 */
export function isComplete(fragment: OkazakiFragment): fragment is LigatedFragment {
  return fragment.phase === 'ligated';
}

function validateStructural(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
  sequence: DNA | undefined,
): Result<void, OkazakiFragmentError> {
  if (id.length === 0) {
    return failure({ kind: 'okazaki/empty-id' });
  }
  if (!Number.isInteger(startPosition) || startPosition < 0) {
    return failure({
      kind: 'okazaki/invalid-position',
      position: startPosition,
      field: 'startPosition',
    });
  }
  if (!Number.isInteger(endPosition) || endPosition <= startPosition) {
    return failure({ kind: 'okazaki/invalid-range', startPosition, endPosition });
  }
  if (primer.position !== startPosition) {
    return failure({
      kind: 'okazaki/primer-position-mismatch',
      primerPosition: primer.position,
      startPosition,
    });
  }
  if (sequence !== undefined && sequence.sequence.length !== endPosition - startPosition) {
    return failure({
      kind: 'okazaki/sequence-length-mismatch',
      sequenceLength: sequence.sequence.length,
      expectedLength: endPosition - startPosition,
    });
  }
  return success(undefined);
}

/**
 * Parses raw inputs into a validated {@link PrimerOnlyFragment} - the initial lifecycle
 * phase where an RNA primer has been laid down but the fragment's DNA has not yet been
 * synthesized.
 *
 * Validates: positions are non-negative integers, `endPosition > startPosition`, and the
 * primer's `position` equals `startPosition`.
 *
 * @param id - Stable identifier
 * @param startPosition - 0-based start position (inclusive)
 * @param endPosition - 0-based end position (exclusive)
 * @param primer - The initiating RNA primer; its `position` must equal `startPosition`
 * @returns `Result.success` containing the {@link PrimerOnlyFragment}, or `Result.failure`
 * carrying an {@link OkazakiFragmentError}
 */
export function parsePrimerOnlyFragment(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
): Result<PrimerOnlyFragment, OkazakiFragmentError> {
  const validation = validateStructural(id, startPosition, endPosition, primer, undefined);
  if (validation.success === false) {
    return failure(validation.error);
  }
  return success(unsafePrimerOnlyFragment(id, startPosition, endPosition, primer));
}

/**
 * Parses raw inputs into a validated {@link SynthesizedFragment} - the lifecycle phase
 * after DNA polymerase III has filled in the lagging-strand DNA but before the RNA primer
 * has been excised.
 *
 * Validates: positions are non-negative integers, `endPosition > startPosition`, the
 * primer's `position` equals `startPosition`, and the supplied `sequence` has length equal
 * to `endPosition - startPosition`.
 *
 * @param id - Stable identifier
 * @param startPosition - 0-based start position (inclusive)
 * @param endPosition - 0-based end position (exclusive)
 * @param primer - The initiating RNA primer; its `position` must equal `startPosition`
 * @param sequence - The DNA filling the fragment; length must equal the fragment range
 * @returns `Result.success` containing the {@link SynthesizedFragment}, or `Result.failure`
 * carrying an {@link OkazakiFragmentError}
 */
export function parseSynthesizedFragment(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
  sequence: DNA,
): Result<SynthesizedFragment, OkazakiFragmentError> {
  const validation = validateStructural(id, startPosition, endPosition, primer, sequence);
  if (validation.success === false) {
    return failure(validation.error);
  }
  return success(unsafeSynthesizedFragment(id, startPosition, endPosition, primer, sequence));
}

/**
 * Parses raw inputs into a validated {@link PrimerRemovedFragment} - the lifecycle phase
 * after 5'-to-3' exonuclease has excised the RNA primer and the gap has been filled with
 * DNA, but before ligation.
 *
 * Validates: positions are non-negative integers, `endPosition > startPosition`, the
 * primer's `position` equals `startPosition`, and the supplied `sequence` has length equal
 * to `endPosition - startPosition`.
 *
 * @param id - Stable identifier
 * @param startPosition - 0-based start position (inclusive)
 * @param endPosition - 0-based end position (exclusive)
 * @param primer - The initiating RNA primer; its `position` must equal `startPosition`
 * @param sequence - The DNA filling the fragment; length must equal the fragment range
 * @returns `Result.success` containing the {@link PrimerRemovedFragment}, or `Result.failure`
 * carrying an {@link OkazakiFragmentError}
 */
export function parsePrimerRemovedFragment(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
  sequence: DNA,
): Result<PrimerRemovedFragment, OkazakiFragmentError> {
  const validation = validateStructural(id, startPosition, endPosition, primer, sequence);
  if (validation.success === false) {
    return failure(validation.error);
  }
  return success(unsafePrimerRemovedFragment(id, startPosition, endPosition, primer, sequence));
}

/**
 * Parses raw inputs into a validated {@link LigatedFragment} - the terminal lifecycle phase
 * after DNA ligase has sealed the fragment to its 5'-adjacent fragment.
 *
 * Validates: positions are non-negative integers, `endPosition > startPosition`, the
 * primer's `position` equals `startPosition`, and the supplied `sequence` has length equal
 * to `endPosition - startPosition`.
 *
 * @param id - Stable identifier
 * @param startPosition - 0-based start position (inclusive)
 * @param endPosition - 0-based end position (exclusive)
 * @param primer - The initiating RNA primer; its `position` must equal `startPosition`
 * @param sequence - The DNA filling the fragment; length must equal the fragment range
 * @returns `Result.success` containing the {@link LigatedFragment}, or `Result.failure`
 * carrying an {@link OkazakiFragmentError}
 */
export function parseLigatedFragment(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
  sequence: DNA,
): Result<LigatedFragment, OkazakiFragmentError> {
  const validation = validateStructural(id, startPosition, endPosition, primer, sequence);
  if (validation.success === false) {
    return failure(validation.error);
  }
  return success(unsafeLigatedFragment(id, startPosition, endPosition, primer, sequence));
}

/**
 * Constructs a {@link PrimerOnlyFragment} without re-validating the inputs. Reserved for
 * `replication/`-internal callers (the `replicate` pipeline) that already know the inputs
 * are well-formed.
 *
 * @internal
 */
export function unsafePrimerOnlyFragment(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
): PrimerOnlyFragment {
  return {
    phase: 'primer-only',
    id,
    startPosition,
    endPosition,
    primer,
  } as PrimerOnlyFragment;
}

/**
 * Constructs a {@link SynthesizedFragment} without re-validating the inputs. Reserved for
 * `replication/`-internal callers (the `replicate` pipeline) that already know the inputs
 * are well-formed.
 *
 * @internal
 */
export function unsafeSynthesizedFragment(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
  sequence: DNA,
): SynthesizedFragment {
  return {
    phase: 'synthesized',
    id,
    startPosition,
    endPosition,
    primer,
    sequence,
  } as SynthesizedFragment;
}

/**
 * Constructs a {@link PrimerRemovedFragment} without re-validating the inputs. Reserved for
 * `replication/`-internal callers (the `replicate` pipeline) that already know the inputs
 * are well-formed.
 *
 * @internal
 */
export function unsafePrimerRemovedFragment(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
  sequence: DNA,
): PrimerRemovedFragment {
  return {
    phase: 'primer-removed',
    id,
    startPosition,
    endPosition,
    primer,
    sequence,
  } as PrimerRemovedFragment;
}

/**
 * Constructs a {@link LigatedFragment} without re-validating the inputs. Reserved for
 * `replication/`-internal callers (the `replicate` pipeline) that already know the inputs
 * are well-formed.
 *
 * @internal
 */
export function unsafeLigatedFragment(
  id: string,
  startPosition: number,
  endPosition: number,
  primer: RNAPrimer,
  sequence: DNA,
): LigatedFragment {
  return {
    phase: 'ligated',
    id,
    startPosition,
    endPosition,
    primer,
    sequence,
  } as LigatedFragment;
}

/**
 * Phase transition: PrimerOnly -\> Synthesized. Returns a new fragment carrying the supplied
 * DNA sequence. Used by the replication pipeline to narrate DNA polymerase III's fill-in
 * step.
 *
 * The signature enforces that synthesis only applies to fragments still in the primer-only
 * phase; calling `synthesize` on a fragment in any later phase is a compile error.
 *
 * @param fragment - The primer-only fragment to advance
 * @param sequence - The newly-synthesized DNA filling the fragment
 * @returns A new {@link SynthesizedFragment}
 *
 * @internal
 */
export function synthesize(fragment: PrimerOnlyFragment, sequence: DNA): SynthesizedFragment {
  return unsafeSynthesizedFragment(
    fragment.id,
    fragment.startPosition,
    fragment.endPosition,
    fragment.primer,
    sequence,
  );
}

/**
 * Phase transition: Synthesized -\> PrimerRemoved. Returns a new fragment flagged as having
 * had its RNA primer excised. Used by the replication pipeline to narrate the 5'-to-3'
 * exonuclease step.
 *
 * The signature enforces that primer removal only applies to fragments that have already
 * been synthesized; calling `removePrimer` on a {@link PrimerOnlyFragment} or a fragment
 * already past this phase is a compile error.
 *
 * @param fragment - The synthesized fragment to advance
 * @returns A new {@link PrimerRemovedFragment}
 *
 * @internal
 */
export function removePrimer(fragment: SynthesizedFragment): PrimerRemovedFragment {
  return unsafePrimerRemovedFragment(
    fragment.id,
    fragment.startPosition,
    fragment.endPosition,
    fragment.primer,
    fragment.sequence,
  );
}

/**
 * Phase transition: PrimerRemoved -\> Ligated. Returns a new fragment flagged as having been
 * sealed to its 5'-adjacent fragment. Used by the replication pipeline to narrate the DNA
 * ligase step.
 *
 * The signature enforces that ligation only applies to fragments whose primer has already
 * been removed; calling `ligate` on a fragment in any earlier phase is a compile error.
 *
 * @param fragment - The primer-removed fragment to advance
 * @returns A new {@link LigatedFragment}
 *
 * @internal
 */
export function ligate(fragment: PrimerRemovedFragment): LigatedFragment {
  return unsafeLigatedFragment(
    fragment.id,
    fragment.startPosition,
    fragment.endPosition,
    fragment.primer,
    fragment.sequence,
  );
}
