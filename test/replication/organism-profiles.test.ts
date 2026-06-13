import { E_COLI, HUMAN, type OrganismProfile } from '../../src/replication';

describe('OrganismProfile constants', () => {
  describe('E_COLI', () => {
    test('exposes prokaryotic kinetics matching the biological literature', () => {
      expect(E_COLI.name).toBe('E. coli');
      expect(E_COLI.type).toBe('prokaryotic');
      expect(E_COLI.polymeraseSpeed).toBe(1000);
      expect(E_COLI.fragmentSize).toEqual([1000, 2000]);
      expect(E_COLI.primerLength).toEqual([3, 10]);
    });

    test('is frozen and rejects mutation', () => {
      const attempt = E_COLI as { polymeraseSpeed: number };
      expect(() => {
        attempt.polymeraseSpeed = 9999;
      }).toThrow();
    });
  });

  describe('HUMAN', () => {
    test('exposes eukaryotic kinetics matching the biological literature', () => {
      expect(HUMAN.name).toBe('Human');
      expect(HUMAN.type).toBe('eukaryotic');
      expect(HUMAN.polymeraseSpeed).toBe(50);
      expect(HUMAN.fragmentSize).toEqual([100, 200]);
      expect(HUMAN.primerLength).toEqual([3, 10]);
    });
  });

  test('shape is assignable to OrganismProfile', () => {
    const _: OrganismProfile = E_COLI;
    const __: OrganismProfile = HUMAN;
    expect(_).toBeDefined();
    expect(__).toBeDefined();
  });
});
