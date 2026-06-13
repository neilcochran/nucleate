import { HUMAN, isComplete, replicateSteps } from '../../src/replication';
import { doubleStrandedDNA, parseDNA } from '../../src/sequence';
import { at } from '../utils/test-utils';

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function parentOf(sequence: string) {
  return doubleStrandedDNA(parseDNA(sequence).unwrap());
}

describe('replicateSteps', () => {
  describe('snapshot stream', () => {
    test('yields at least one snapshot (the initial state)', () => {
      const parent = parentOf('ATCGATCGAT');
      const snapshots = [...replicateSteps(parent).unwrap()];
      expect(snapshots.length).toBeGreaterThanOrEqual(1);
      expect(at(snapshots, 0).step).toBe(0);
      expect(at(snapshots, 0).lastEvent).toBeUndefined();
    });

    test('step counter increments by 1 across the stream', () => {
      const parent = parentOf('A'.repeat(400));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(0) }).unwrap(),
      ];
      snapshots.forEach((snapshot, i) => {
        expect(snapshot.step).toBe(i);
      });
    });

    test('every non-initial snapshot carries lastEvent', () => {
      const parent = parentOf('ATCGATCGATCG');
      const snapshots = [...replicateSteps(parent).unwrap()];
      snapshots.slice(1).forEach(snapshot => {
        expect(snapshot.lastEvent).toBeDefined();
      });
    });

    test('snapshots and their fragment lists are frozen', () => {
      const parent = parentOf('ATCGATCGATCG');
      const snapshots = [...replicateSteps(parent).unwrap()];
      snapshots.forEach(snapshot => {
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.fragments)).toBe(true);
      });
    });
  });

  describe('progress monotonicity', () => {
    test('forkPosition is non-decreasing across the stream', () => {
      const parent = parentOf('A'.repeat(800));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(2) }).unwrap(),
      ];
      for (let i = 1; i < snapshots.length; i++) {
        expect(at(snapshots, i).forkPosition).toBeGreaterThanOrEqual(
          at(snapshots, i - 1).forkPosition,
        );
      }
    });

    test('leadingStrandSynthesized is non-decreasing across the stream', () => {
      const parent = parentOf('A'.repeat(800));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(2) }).unwrap(),
      ];
      for (let i = 1; i < snapshots.length; i++) {
        expect(at(snapshots, i).leadingStrandSynthesized).toBeGreaterThanOrEqual(
          at(snapshots, i - 1).leadingStrandSynthesized,
        );
      }
    });

    test('final forkPosition equals template length', () => {
      const parent = parentOf('A'.repeat(400));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(3) }).unwrap(),
      ];
      const last = at(snapshots, snapshots.length - 1);
      expect(last.forkPosition).toBe(400);
    });

    test('final leadingStrandSynthesized equals template length', () => {
      const parent = parentOf('A'.repeat(300));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(4) }).unwrap(),
      ];
      const last = at(snapshots, snapshots.length - 1);
      expect(last.leadingStrandSynthesized).toBe(300);
    });
  });

  describe('fragment lifecycle progression', () => {
    test('initial snapshot has no fragments', () => {
      const parent = parentOf('ATCGATCGATCG');
      const snapshots = [...replicateSteps(parent).unwrap()];
      expect(at(snapshots, 0).fragments).toEqual([]);
    });

    test('fragment count grows monotonically until the final fragment is placed', () => {
      const parent = parentOf('A'.repeat(500));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(1) }).unwrap(),
      ];
      let lastCount = 0;
      for (const snapshot of snapshots) {
        expect(snapshot.fragments.length).toBeGreaterThanOrEqual(lastCount);
        lastCount = snapshot.fragments.length;
      }
    });

    test('after a primer-synthesis snapshot, the fragment has no sequence yet', () => {
      const parent = parentOf('A'.repeat(300));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(7) }).unwrap(),
      ];
      const primerSnap = snapshots.find(s => s.lastEvent?.kind === 'primer-synthesis');
      expect(primerSnap).toBeDefined();
      if (primerSnap) {
        const newest = at(primerSnap.fragments, primerSnap.fragments.length - 1);
        expect(newest.phase).toBe('primer-only');
      }
    });

    test('after a lagging-synthesis snapshot, the newest fragment has its sequence populated', () => {
      const parent = parentOf('A'.repeat(300));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(7) }).unwrap(),
      ];
      const synthSnap = snapshots.find(s => s.lastEvent?.kind === 'lagging-synthesis');
      expect(synthSnap).toBeDefined();
      if (synthSnap) {
        const newest = at(synthSnap.fragments, synthSnap.fragments.length - 1);
        expect(newest.phase).toBe('synthesized');
        if (newest.phase === 'synthesized') {
          expect(newest.sequence).toBeDefined();
        }
      }
    });

    test('after primer-removal snapshots, the targeted fragment is flagged removed', () => {
      const parent = parentOf('A'.repeat(300));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(7) }).unwrap(),
      ];
      const removalSnap = snapshots.find(s => s.lastEvent?.kind === 'primer-removal');
      expect(removalSnap).toBeDefined();
      if (removalSnap?.lastEvent?.fragmentId !== undefined) {
        const targeted = removalSnap.fragments.find(
          f => f.id === removalSnap.lastEvent?.fragmentId,
        );
        expect(targeted?.phase).toBe('primer-removed');
      }
    });

    test('after all ligation events, every fragment is complete', () => {
      const parent = parentOf('A'.repeat(300));
      const snapshots = [
        ...replicateSteps(parent, { organism: HUMAN, rng: seededRng(7) }).unwrap(),
      ];
      const last = at(snapshots, snapshots.length - 1);
      last.fragments.forEach(fragment => {
        expect(isComplete(fragment)).toBe(true);
      });
    });
  });

  describe('failure behavior', () => {
    test('returns Result.failure on a template that is too short', () => {
      const parent = parentOf('ATG');
      const result = replicateSteps(parent);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('replication/template-too-short');
      }
    });
  });
});
