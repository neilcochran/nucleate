import { RNA, parseRNA } from '../../src/sequence';
import {
  findPolyadenylationSites,
  getStrongestPolyadenylationSite,
  filterPolyadenylationSites,
  DEFAULT_CLEAVAGE_OPTIONS,
  POLYA_SIGNAL_OFFSET,
} from '../../src/polyadenylation';
import { at } from '../utils/test-utils';

function rna(sequence: string): RNA {
  return parseRNA(sequence).unwrap();
}

describe('findPolyadenylationSites', () => {
  test('finds the canonical AAUAAA signal', () => {
    const sites = findPolyadenylationSites(rna('AUGAAACCCAAUAAAGGGCCCAAAUUUCCCGGG'));
    expect(sites).toHaveLength(1);
    expect(at(sites, 0).position).toBe(9);
    expect(at(sites, 0).signal).toBe('AAUAAA');
    expect(at(sites, 0).strength).toBe(100);
  });

  test('finds the AUUAAA alternative signal', () => {
    const sites = findPolyadenylationSites(rna('AUGAAACCCAUUAAAGGGCCCAAAUUUCCCGGG'));
    expect(sites).toHaveLength(1);
    expect(at(sites, 0).signal).toBe('AUUAAA');
    expect(at(sites, 0).strength).toBeGreaterThanOrEqual(80);
  });

  test('sorts by strength then by position', () => {
    const sites = findPolyadenylationSites(
      rna('AAUAAAGGGAAAAAAAUUAAUAAACCCAAAAAAAUUAUUAAACCCAAAAAAGGGCCCUUUAAAAA'),
    );
    expect(sites.length).toBeGreaterThan(1);
    for (let i = 1; i < sites.length; i++) {
      const prev = at(sites, i - 1);
      const curr = at(sites, i);
      if (prev.strength === curr.strength) {
        expect(prev.position).toBeLessThanOrEqual(curr.position);
      } else {
        expect(prev.strength).toBeGreaterThanOrEqual(curr.strength);
      }
    }
  });

  test('returns an empty array when no signals are present', () => {
    expect(findPolyadenylationSites(rna('AUGAAACCCGGGCCCUUU'))).toEqual([]);
  });

  test('rejects sequences shorter than MIN_RNA_SEQUENCE_FOR_POLYA_SEARCH', () => {
    expect(findPolyadenylationSites(rna('AAUAAA'))).toEqual([]);
  });

  test('boosts strength when an upstream USE element is present', () => {
    const sites = findPolyadenylationSites(rna('AUGUUUUUUAGUAAAGGGCCCAAAUCCCGGGUUUAAAA'));
    expect(sites).toHaveLength(1);
    expect(at(sites, 0).strength).toBeGreaterThan(30);
    expect(at(sites, 0).upstreamUSE).toBeDefined();
  });

  test('boosts strength when a downstream DSE element is present', () => {
    const sites = findPolyadenylationSites(rna('AUGAGUAAAUUUUUUGGGCCC'));
    expect(sites).toHaveLength(1);
    expect(at(sites, 0).downstreamDSE).toBeDefined();
    expect(at(sites, 0).strength).toBeGreaterThan(30);
  });

  test('predicts a cleavage site downstream of the signal in the configured distance range', () => {
    const sites = findPolyadenylationSites(rna('AAUAAAGGGCCCAAAUUUCCC'));
    expect(sites).toHaveLength(1);
    const first = at(sites, 0);
    const cleavage = first.cleavageSite;
    expect(cleavage).toBeDefined();
    if (cleavage !== undefined) {
      expect(cleavage).toBeGreaterThan(first.position + POLYA_SIGNAL_OFFSET);
      expect(cleavage).toBeLessThan(first.position + 30);
    }
  });

  test('tolerates an unparseable signal string in the options list', () => {
    const sites = findPolyadenylationSites(rna('AUGAAACCCAAUAAAGGGCCCAAAUUUCCCGGG'), {
      polyASignal: ['AAUAAA', 'NOTASIGNAL'],
    });
    expect(sites.some(site => site.signal === 'AAUAAA')).toBe(true);
  });

  test("uses each matched signal's own length for the cleavage-distance check (regression)", () => {
    // The legacy implementation indexed `polyASignal[0].length` for every match - so a
    // heterogeneous list with an unparseable first entry would size every cleavage check
    // against zero. The new shape passes the actually-matched signal length.
    const sites = findPolyadenylationSites(rna('AUGAAACCCAAUAAAGGGCCCAAAUUUCCCGGG'), {
      polyASignal: ['NOTASIGNAL', 'AAUAAA'],
    });
    expect(sites.some(site => site.signal === 'AAUAAA' && site.cleavageSite !== undefined)).toBe(
      true,
    );
  });
});

describe('getStrongestPolyadenylationSite', () => {
  test('returns the highest-strength site', () => {
    const sites = findPolyadenylationSites(rna('AGUAAAGGGAAUAAACCCAUUAAACCCAAAAAACCCGGGAAAA'));
    const strongest = getStrongestPolyadenylationSite(sites);
    expect(strongest).toBeDefined();
    if (strongest !== undefined) {
      expect(strongest.signal).toBe('AAUAAA');
      expect(strongest.strength).toBe(100);
    }
  });

  test('returns undefined for an empty array', () => {
    expect(getStrongestPolyadenylationSite([])).toBeUndefined();
  });
});

describe('filterPolyadenylationSites', () => {
  test('filters sites by minimum strength', () => {
    const all = findPolyadenylationSites(rna('AAUAAAGGGAGUAAACCCAUUAAACCCAAAAAACCCGGGAAAA'));
    const strong = filterPolyadenylationSites(all, 50);
    expect(strong.length).toBeLessThanOrEqual(all.length);
    for (const site of strong) {
      expect(site.strength).toBeGreaterThanOrEqual(50);
    }
  });
});

describe('DEFAULT_CLEAVAGE_OPTIONS', () => {
  test('lists the canonical signals', () => {
    expect(DEFAULT_CLEAVAGE_OPTIONS.polyASignal).toContain('AAUAAA');
    expect(DEFAULT_CLEAVAGE_OPTIONS.polyASignal).toContain('AUUAAA');
  });

  test('uses the standard cleavage distance range', () => {
    expect(DEFAULT_CLEAVAGE_OPTIONS.distanceRange).toEqual([11, 23]);
  });

  test('prefers A over U over C over G at the cleavage site', () => {
    expect(DEFAULT_CLEAVAGE_OPTIONS.cleavagePreference).toEqual(['A', 'U', 'C', 'G']);
  });
});
