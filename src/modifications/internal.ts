/**
 * In-tree-only entry point for `modifications/`. Re-exports the non-validating `unsafeMRNA`
 * factory so the `processing/` pipeline can build a mature mRNA once it has already computed and
 * validated the coding boundaries and tail, without reaching into the implementation file.
 *
 * Not part of the package's public surface: this module is absent from the barrel (`index.ts`)
 * and from the `package.json` `exports` map, so package consumers cannot import it - they must
 * use `parseMRNA` or `processRNA`.
 */
export { unsafeMRNA } from './MRNA.js';
