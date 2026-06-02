/**
 * Tagged-union errors raised by the `polyadenylation/` module: the poly-A tail helpers
 * (`add3PrimePolyATail`, `add3PrimePolyATailAtSite`).
 *
 * Human-readable messages are produced by the renderer function below rather than carried
 * alongside the structured payload.
 */

import { makeDescriber } from '../result/index.js';

/**
 * Error variants produced by the poly-A tail helpers (`add3PrimePolyATail`,
 * `add3PrimePolyATailAtSite`, `remove3PrimePolyATail`).
 *
 * - `invalid-cleavage-site`: a negative cleavage-site index was supplied.
 * - `invalid-tail-length`: tail length is negative or exceeds the maximum allowed.
 * - `no-poly-a-tail`: the RNA has no trailing poly-A run to remove.
 */
export type PolyadenylationError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-cleavage-site';
      /** The cleavage-site value the caller supplied. */
      readonly cleavageSite: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'invalid-tail-length';
      /** The tail length value the caller supplied. */
      readonly tailLength: number;
      /** Maximum tail length allowed. */
      readonly max: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'no-poly-a-tail';
    };

/** Renders a {@link PolyadenylationError} as a human-readable message. */
export const describePolyadenylationError = makeDescriber<PolyadenylationError>({
  'invalid-cleavage-site': e =>
    `Invalid cleavage site ${e.cleavageSite}: must be a non-negative integer`,
  'invalid-tail-length': e =>
    `Invalid poly-A tail length ${e.tailLength}: must be between 0 and ${e.max}`,
  'no-poly-a-tail': () => "RNA has no 3' poly-A tail to remove",
});
