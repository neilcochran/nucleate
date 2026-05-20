/**
 * Tagged-union errors raised by the `polyadenylation/` module: the poly-A tail helpers
 * (`add3PrimePolyATail`, `add3PrimePolyATailAtSite`).
 *
 * Human-readable messages are produced by the renderer function below rather than carried
 * alongside the structured payload.
 */

import { assertUnreachable } from '../result/index.js';

/**
 * Error variants produced by `add3PrimePolyATail` and `add3PrimePolyATailAtSite`.
 *
 * - `invalid-cleavage-site`: a negative cleavage-site index was supplied.
 * - `invalid-tail-length`: tail length is negative or exceeds the maximum allowed.
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
    };

/** Renders a {@link PolyadenylationError} as a human-readable message. */
export function describePolyadenylationError(error: PolyadenylationError): string {
  switch (error.kind) {
    case 'invalid-cleavage-site':
      return `Invalid cleavage site ${error.cleavageSite}: must be a non-negative integer`;
    case 'invalid-tail-length':
      return `Invalid poly-A tail length ${error.tailLength}: must be between 0 and ${error.max}`;
    default:
      return assertUnreachable(error);
  }
}
