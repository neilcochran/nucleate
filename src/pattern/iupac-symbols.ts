/**
 * IUPAC nucleotide-pattern symbol table and its derived lookup helpers.
 *
 * The base map `NUCLEOTIDE_PATTERN_SYMBOLS` is the single source of truth: each IUPAC symbol
 * (`A`, `T`, `C`, `G`, `U`, `R`, `Y`, `K`, `M`, `S`, `W`, `B`, `V`, `D`, `H`, `N`) maps to the
 * concrete bases it matches. Symbol complement is derived programmatically from this table
 * rather than maintained as a hand-written switch.
 *
 * @see {@link https://en.wikipedia.org/wiki/Nucleic_acid_notation#IUPAC_notation|IUPAC notation}
 */

/**
 * IUPAC nucleotide pattern symbols mapped to the concrete bases each one matches.
 *
 * Declared `as const` so callers receive deeply-readonly literal types: the keys are the exact
 * IUPAC symbols and each value is a `readonly` tuple of base letters. Order within each tuple
 * is the conventional ordering used in IUPAC documentation.
 */
export const NUCLEOTIDE_PATTERN_SYMBOLS = {
  A: ['A'],
  T: ['T'],
  C: ['C'],
  G: ['G'],
  U: ['U'],
  R: ['G', 'A'],
  Y: ['C', 'T'],
  K: ['G', 'T'],
  M: ['A', 'C'],
  S: ['G', 'C'],
  W: ['A', 'T'],
  B: ['G', 'T', 'C'],
  V: ['G', 'C', 'A'],
  D: ['G', 'A', 'T'],
  H: ['A', 'C', 'T'],
  N: ['A', 'G', 'C', 'T'],
} as const;

/**
 * Union of the valid IUPAC nucleotide pattern symbols (the keys of {@link NUCLEOTIDE_PATTERN_SYMBOLS}).
 */
export type IUPACSymbol = keyof typeof NUCLEOTIDE_PATTERN_SYMBOLS;

/**
 * Reports whether a single character is a valid IUPAC nucleotide pattern symbol.
 *
 * Comparison is case-insensitive; the character is upper-cased before lookup.
 *
 * @param character - A single character to test
 * @returns `true` iff `character` (upper-cased) is one of the IUPAC symbols
 */
export function isIUPACSymbol(character: string): character is IUPACSymbol {
  return character.toUpperCase() in NUCLEOTIDE_PATTERN_SYMBOLS;
}

/**
 * Base-level complement used to derive IUPAC symbol complements.
 *
 * The convention is DNA-favoring: `A` and `T` swap, `C` and `G` swap, and `U` complements
 * to `A` (RNA's `U` complements to DNA's `A`, the same as the legacy hand-written switch).
 * Symbol-set complementation looks up each base through this map.
 */
const BASE_COMPLEMENT: Readonly<Record<string, string>> = Object.freeze({
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
  U: 'A',
});

/**
 * Sorted base-set to IUPAC symbol reverse lookup, computed once from {@link NUCLEOTIDE_PATTERN_SYMBOLS}.
 *
 * The key is the symbol's matching bases sorted alphabetically and joined with a comma; the
 * value is the IUPAC symbol whose matching-bases set is identical. Used by
 * {@link complementIUPACSymbol} to find "which symbol matches this complemented base set".
 */
const SYMBOL_BY_SORTED_BASES: ReadonlyMap<string, IUPACSymbol> = (() => {
  const map = new Map<string, IUPACSymbol>();
  for (const symbol of Object.keys(NUCLEOTIDE_PATTERN_SYMBOLS) as IUPACSymbol[]) {
    const bases = NUCLEOTIDE_PATTERN_SYMBOLS[symbol];
    const key = [...bases].sort().join(',');
    if (!map.has(key)) {
      map.set(key, symbol);
    }
  }
  return map;
})();

/**
 * Programmatic IUPAC complement: maps a symbol to the IUPAC symbol whose base-set is the
 * Watson-Crick complement of this symbol's base-set.
 *
 * Worked examples: `A` complements to `T`; the purine ambiguity `R` (matching G or A)
 * complements to the pyrimidine ambiguity `Y` (matching C or T); the weak ambiguity `W`
 * (matching A or T) complements to itself; `N` (matching any base) complements to itself.
 * The `U` complement is `A`, matching the legacy hand-written switch and acknowledging that
 * IUPAC ambiguity codes were originally defined for DNA. As a consequence `U` does not
 * round-trip under double complementation (`U` complements to `A`, which complements to
 * `T`); that asymmetry is preserved from the previous implementation.
 *
 * @param symbol - An IUPAC nucleotide pattern symbol (one of {@link IUPACSymbol})
 * @returns The complement symbol
 */
export function complementIUPACSymbol(symbol: IUPACSymbol): IUPACSymbol {
  const bases = NUCLEOTIDE_PATTERN_SYMBOLS[symbol];
  const complementedBases: string[] = [];
  for (const base of bases) {
    const complemented = BASE_COMPLEMENT[base];
    if (complemented === undefined) {
      throw new Error(
        `IUPAC symbol '${symbol}' contains base '${base}' that has no defined complement`,
      );
    }
    complementedBases.push(complemented);
  }
  const key = complementedBases.sort().join(',');
  const result = SYMBOL_BY_SORTED_BASES.get(key);
  if (result === undefined) {
    throw new Error(
      `No IUPAC symbol matches the complemented base set for '${symbol}': {${complementedBases.join(',')}}`,
    );
  }
  return result;
}
