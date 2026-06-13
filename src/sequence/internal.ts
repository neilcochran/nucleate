/**
 * In-tree-only entry point for `sequence/`. Re-exports the non-validating `unsafe*` factories so
 * other `src/` modules can construct sequence types when they have already proven the input
 * well-formed (e.g. after slicing a validated sequence), without reaching into individual
 * implementation files.
 *
 * Not part of the package's public surface: this module is absent from the barrel (`index.ts`)
 * and from the `package.json` `exports` map, so `@neilcochran/nucleate/sequence/internal` is not
 * importable by package consumers - they must go through the validating parsers (`parseDNA`,
 * `parseRNA`, `parseDoubleStrandedDNA`, `parseCodon`).
 */
export { unsafeDNA } from './DNA.js';
export { unsafeRNA } from './RNA.js';
export { unsafeDoubleStrandedDNA } from './DoubleStrandedDNA.js';
export { unsafeCodon } from './codons.js';
