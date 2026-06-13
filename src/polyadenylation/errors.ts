/**
 * Tagged-union errors raised by the `polyadenylation/` module: the poly-A tail helpers
 * (`add3PrimePolyATail`, `add3PrimePolyATailAtSite`, `remove3PrimePolyATail`). The `kind`
 * discriminators are namespaced under `polyadenylation/`. Human-readable messages are produced
 * centrally by `describeError` (see `src/describe.ts`).
 */

/**
 * Error variants produced by the poly-A tail helpers (`add3PrimePolyATail`,
 * `add3PrimePolyATailAtSite`, `remove3PrimePolyATail`).
 *
 * - `polyadenylation/invalid-cleavage-site`: a negative cleavage-site index was supplied.
 * - `polyadenylation/invalid-tail-length`: tail length is negative or exceeds the maximum allowed.
 * - `polyadenylation/no-poly-a-tail`: the RNA has no trailing poly-A run to remove.
 */
export type PolyadenylationError =
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'polyadenylation/invalid-cleavage-site';
      /** The cleavage-site value the caller supplied. */
      readonly cleavageSite: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'polyadenylation/invalid-tail-length';
      /** The tail length value the caller supplied. */
      readonly tailLength: number;
      /** Maximum tail length allowed. */
      readonly max: number;
    }
  | {
      /** Discriminator naming the failure mode. */
      readonly kind: 'polyadenylation/no-poly-a-tail';
    };
