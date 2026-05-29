import {
  HUMAN,
  replicate,
  type ReplicationEvent,
  type ReplicationOutput,
} from '../../src/replication';
import { doubleStrandedDNA, parseDNA } from '../../src/sequence';

/** Deterministic LCG-style PRNG for reproducibility in fragment-sizing tests. */
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

function expectSuccess(output: ReturnType<typeof replicate>): ReplicationOutput {
  if (output.success === false) {
    throw new Error(`Expected success, got failure: ${output.error.kind}`);
  }
  return output.data;
}

describe('replicate', () => {
  describe('daughter strand correctness', () => {
    test('daughters are sequence-equal to the parent on a small E. coli template', () => {
      const parent = parentOf('ATGCGATCGTAGCTACGTATCG');
      const output = expectSuccess(replicate(parent));
      const [d1, d2] = output.daughters;
      expect(d1.forward.sequence).toBe(parent.forward.sequence);
      expect(d1.reverse.sequence).toBe(parent.reverse.sequence);
      expect(d2.forward.sequence).toBe(parent.forward.sequence);
      expect(d2.reverse.sequence).toBe(parent.reverse.sequence);
    });

    test('daughter duplexes validate as complementary', () => {
      const parent = parentOf('ATGCGATCGTAGCTACGT');
      const output = expectSuccess(replicate(parent));
      for (const daughter of output.daughters) {
        const expectedReverse = daughter.forward.getReverseComplement().sequence;
        expect(daughter.reverse.sequence).toBe(expectedReverse);
      }
    });

    test('handles a homopolymer template', () => {
      const parent = parentOf('AAAAAAAAAAAAAAAAAAAA');
      const output = expectSuccess(replicate(parent));
      expect(output.daughters[0].forward.sequence).toBe('AAAAAAAAAAAAAAAAAAAA');
      expect(output.daughters[0].reverse.sequence).toBe('TTTTTTTTTTTTTTTTTTTT');
    });

    test('handles a palindromic template', () => {
      const parent = parentOf('GAATTCGAATTC');
      const output = expectSuccess(replicate(parent));
      expect(output.daughters[0].forward.sequence).toBe('GAATTCGAATTC');
      expect(output.daughters[0].reverse.sequence).toBe('GAATTCGAATTC');
    });

    test('handles a long template by producing daughters of equal length', () => {
      const sequence = 'ATCG'.repeat(500);
      const parent = parentOf(sequence);
      const output = expectSuccess(replicate(parent));
      expect(output.daughters[0].forward.sequence.length).toBe(sequence.length);
      expect(output.daughters[0].forward.sequence).toBe(sequence);
    });

    test('daughter[0] keeps parental forward strand by reference; reverse is freshly synthesized', () => {
      const parent = parentOf('ATGCGATCGTAGCTACGTATCG');
      const output = expectSuccess(replicate(parent));
      const [d1] = output.daughters;
      expect(d1.forward).toBe(parent.forward);
      expect(d1.reverse).not.toBe(parent.reverse);
      expect(d1.reverse.sequence).toBe(parent.reverse.sequence);
    });

    test('daughter[1] keeps parental reverse strand by reference; forward is freshly synthesized', () => {
      const parent = parentOf('ATGCGATCGTAGCTACGTATCG');
      const output = expectSuccess(replicate(parent));
      const [, d2] = output.daughters;
      expect(d2.reverse).toBe(parent.reverse);
      expect(d2.forward).not.toBe(parent.forward);
      expect(d2.forward.sequence).toBe(parent.forward.sequence);
    });
  });

  describe('template-too-short failures', () => {
    test('rejects E. coli template shorter than 10 bp', () => {
      const parent = parentOf('ATCGATCG');
      const result = replicate(parent);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('template-too-short');
        expect(result.error.length).toBe(8);
        expect(result.error.minimum).toBe(10);
      }
    });

    test('rejects 3-bp template (legacy edge case)', () => {
      const parent = parentOf('ATG');
      const result = replicate(parent);
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'template-too-short') {
        expect(result.error.length).toBe(3);
      }
    });

    test('accepts a template exactly at the minimum length (10 bp for E. coli)', () => {
      const parent = parentOf('ATCGATCGAT');
      const result = replicate(parent);
      expect(result.success).toBe(true);
    });

    test('HUMAN profile has the same 10-bp minimum (matching primer-length max)', () => {
      const parent = parentOf('ATCGATCG');
      const result = replicate(parent, { organism: HUMAN });
      expect(!result.success).toBe(true);
      if (!result.success && result.error.kind === 'template-too-short') {
        expect(result.error.minimum).toBe(10);
      }
    });
  });

  describe('Okazaki fragment placement', () => {
    test('a single short E. coli template produces exactly one fragment', () => {
      const parent = parentOf('ATCGATCGATCG');
      const output = expectSuccess(replicate(parent));
      expect(output.statistics.okazakiFragmentCount).toBe(1);
    });

    test('fragments tile the template without gaps or overlap', () => {
      const parent = parentOf('A'.repeat(400));
      const output = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(7) }));
      const fragmentEvents = output.events.filter(e => e.kind === 'primer-synthesis');
      const synthEvents = output.events.filter(e => e.kind === 'lagging-synthesis');
      expect(fragmentEvents.length).toBe(synthEvents.length);

      const sortedStarts = synthEvents.map(e => e.position).sort((a, b) => a - b);
      expect(sortedStarts[0]).toBe(0);
      for (let i = 1; i < sortedStarts.length; i++) {
        const prevEvent = synthEvents.find(e => e.position === sortedStarts[i - 1]);
        const expectedNextStart = (prevEvent?.position ?? 0) + (prevEvent?.basePairs ?? 0);
        expect(sortedStarts[i]).toBe(expectedNextStart);
      }
    });

    test('HUMAN organism produces more (smaller) fragments than E_COLI on the same template', () => {
      const parent = parentOf('A'.repeat(5000));
      const ecoli = expectSuccess(replicate(parent, { rng: seededRng(42) }));
      const human = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(42) }));
      expect(human.statistics.okazakiFragmentCount).toBeGreaterThan(
        ecoli.statistics.okazakiFragmentCount,
      );
    });

    test('fragment sizes fall within the organism range (clamped to remaining length at the end)', () => {
      const parent = parentOf('A'.repeat(450));
      const output = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(3) }));
      const synthEvents = output.events.filter(e => e.kind === 'lagging-synthesis');
      const [min, max] = HUMAN.fragmentSize;
      synthEvents.forEach((event, index) => {
        if (index < synthEvents.length - 1) {
          expect(event.basePairs).toBeGreaterThanOrEqual(min);
          expect(event.basePairs).toBeLessThanOrEqual(max);
        } else {
          expect(event.basePairs).toBeLessThanOrEqual(max);
          expect(event.basePairs).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('event log narration', () => {
    test('event list is non-empty, frozen, and shaped correctly', () => {
      const parent = parentOf('ATCGATCGATCG');
      const output = expectSuccess(replicate(parent));
      expect(output.events.length).toBeGreaterThan(0);
      expect(Object.isFrozen(output.events)).toBe(true);
      output.events.forEach(event => {
        expect(Object.isFrozen(event)).toBe(true);
        expect(typeof event.kind).toBe('string');
        expect(typeof event.position).toBe('number');
        expect(typeof event.basePairs).toBe('number');
        expect(['leading', 'lagging', 'both']).toContain(event.strand);
      });
    });

    test('per-fragment event sequence is unwind, leading-synthesis, primer-synthesis, lagging-synthesis (in order)', () => {
      const parent = parentOf('ATCGATCGATCG');
      const output = expectSuccess(replicate(parent));
      const perFragmentKinds = output.events
        .filter(e =>
          ['unwind', 'leading-synthesis', 'primer-synthesis', 'lagging-synthesis'].includes(e.kind),
        )
        .map(e => e.kind);
      expect(perFragmentKinds).toEqual([
        'unwind',
        'leading-synthesis',
        'primer-synthesis',
        'lagging-synthesis',
      ]);
    });

    test('processing events (primer-removal, ligation) occur after all synthesis events', () => {
      const parent = parentOf('A'.repeat(400));
      const output = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(1) }));
      const synthIndices: number[] = [];
      const removalIndices: number[] = [];
      const ligationIndices: number[] = [];
      output.events.forEach((event, i) => {
        if (event.kind === 'lagging-synthesis') {
          synthIndices.push(i);
        } else if (event.kind === 'primer-removal') {
          removalIndices.push(i);
        } else if (event.kind === 'ligation') {
          ligationIndices.push(i);
        }
      });
      expect(Math.max(...synthIndices)).toBeLessThan(Math.min(...removalIndices));
      expect(Math.max(...removalIndices)).toBeLessThan(Math.min(...ligationIndices));
    });

    test('all lagging-strand events carry the fragmentId of an actually-produced fragment', () => {
      const parent = parentOf('A'.repeat(400));
      const output = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(11) }));
      const fragmentIds = new Set(
        output.events
          .filter(e => e.kind === 'primer-synthesis')
          .map(e => e.fragmentId)
          .filter((id): id is string => id !== undefined),
      );
      output.events
        .filter(e => e.strand === 'lagging')
        .forEach(event => {
          expect(event.fragmentId).toBeDefined();
          if (event.fragmentId !== undefined) {
            expect(fragmentIds.has(event.fragmentId)).toBe(true);
          }
        });
    });

    test('ligation events have basePairs === 0 (sealing does not change base pair count)', () => {
      const parent = parentOf('ATCGATCGATCG');
      const output = expectSuccess(replicate(parent));
      output.events
        .filter(e => e.kind === 'ligation')
        .forEach((event: ReplicationEvent) => {
          expect(event.basePairs).toBe(0);
        });
    });
  });

  describe('statistics', () => {
    test('reports leading and lagging strand lengths equal to template length', () => {
      const parent = parentOf('A'.repeat(150));
      const output = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(5) }));
      expect(output.statistics.leadingStrandLength).toBe(150);
      expect(output.statistics.laggingStrandLength).toBe(150);
    });

    test('simulatedTimeSeconds = templateLength / polymeraseSpeed', () => {
      const parent = parentOf('A'.repeat(500));
      const output = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(2) }));
      expect(output.statistics.simulatedTimeSeconds).toBeCloseTo(500 / HUMAN.polymeraseSpeed, 9);
    });

    test('averageOkazakiFragmentSize matches the total / count', () => {
      const parent = parentOf('A'.repeat(750));
      const output = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(8) }));
      expect(output.statistics.averageOkazakiFragmentSize).toBe(
        output.statistics.laggingStrandLength / output.statistics.okazakiFragmentCount,
      );
    });

    test('totalSteps equals the event count', () => {
      const parent = parentOf('A'.repeat(300));
      const output = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(0) }));
      expect(output.statistics.totalSteps).toBe(output.events.length);
    });
  });

  describe('RNG determinism', () => {
    test('two runs with the same seeded RNG produce identical fragment counts and average sizes', () => {
      const parent = parentOf('A'.repeat(1000));
      const a = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(123) }));
      const b = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(123) }));
      expect(a.statistics.okazakiFragmentCount).toBe(b.statistics.okazakiFragmentCount);
      expect(a.statistics.averageOkazakiFragmentSize).toBe(b.statistics.averageOkazakiFragmentSize);
    });

    test('different seeds yield different fragment layouts', () => {
      const parent = parentOf('A'.repeat(800));
      const a = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(1) }));
      const b = expectSuccess(replicate(parent, { organism: HUMAN, rng: seededRng(2) }));
      const aLayout = a.events
        .filter(e => e.kind === 'lagging-synthesis')
        .map(e => `${e.position}:${e.basePairs}`)
        .join(',');
      const bLayout = b.events
        .filter(e => e.kind === 'lagging-synthesis')
        .map(e => `${e.position}:${e.basePairs}`)
        .join(',');
      expect(aLayout).not.toBe(bLayout);
    });
  });
});
