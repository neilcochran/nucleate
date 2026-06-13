/**
 * Organism-specific parameters that affect DNA replication kinetics and architecture.
 *
 * Profiles are pure data; they carry no behavior. The fields are limited to values the
 * replication pipeline actually consumes (polymerase speed, Okazaki fragment size range,
 * primer length range, nucleosome presence) plus a human-readable name and the broad
 * prokaryotic / eukaryotic classification.
 */
export interface OrganismProfile {
  /** Human-readable name (e.g. "E. coli"). */
  readonly name: string;

  /**
   * Broad classification driving structural assumptions (presence of nucleosomes, typical
   * fragment sizes).
   */
  readonly type: 'prokaryotic' | 'eukaryotic';

  /** Base DNA polymerase III speed in base pairs per second. */
  readonly polymeraseSpeed: number;

  /** Inclusive `[min, max]` range of Okazaki fragment sizes in nucleotides. */
  readonly fragmentSize: readonly [number, number];

  /** Inclusive `[min, max]` range of RNA primer lengths in nucleotides. */
  readonly primerLength: readonly [number, number];
}

/**
 * Replication parameters for *Escherichia coli*. Polymerase III speed ~1000 bp/s; Okazaki
 * fragments ~1000-2000 nt; RNA primers ~3-10 nt (prokaryotic).
 */
export const E_COLI: OrganismProfile = Object.freeze({
  name: 'E. coli',
  type: 'prokaryotic' as const,
  polymeraseSpeed: 1000,
  fragmentSize: Object.freeze([1000, 2000] as const),
  primerLength: Object.freeze([3, 10] as const),
});

/**
 * Replication parameters for human cells. Polymerase delta speed ~50 bp/s; Okazaki fragments
 * ~100-200 nt; RNA primers ~3-10 nt (eukaryotic).
 */
export const HUMAN: OrganismProfile = Object.freeze({
  name: 'Human',
  type: 'eukaryotic' as const,
  polymeraseSpeed: 50,
  fragmentSize: Object.freeze([100, 200] as const),
  primerLength: Object.freeze([3, 10] as const),
});
