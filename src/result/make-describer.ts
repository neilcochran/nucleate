/**
 * Maps each variant of a discriminated-union error type to a function that renders that one
 * variant as a human-readable string. The mapped type is keyed by the union's `kind`
 * discriminator: every `kind` must have exactly one renderer, and `Extract` narrows each
 * renderer's parameter to the matching variant so its payload fields are available without a
 * manual `case` narrowing.
 *
 * Authoring an arms record of this type makes exhaustiveness a compile-time property: omitting
 * a `kind` fails to type-check (a missing key), and naming a non-existent `kind` fails too (an
 * excess key). This replaces the runtime `assertUnreachable` default arm a hand-written
 * `switch` needed to catch a forgotten variant.
 *
 * @typeParam E - The discriminated-union error type, discriminated on a string `kind` field
 */
export type DescriberArms<E extends { readonly kind: string }> = {
  readonly [K in E['kind']]: (error: Extract<E, { readonly kind: K }>) => string;
};

/**
 * Builds a renderer for a discriminated-union error type from a {@link DescriberArms} record,
 * replacing the hand-written `switch` + `assertUnreachable` pattern. The returned function looks
 * up the arm for the value's `kind` and applies it.
 *
 * Compose nested error unions two ways:
 * - Wrapped error (a variant carries a `cause` field): the arm delegates, e.g.
 *   `'invalid-sequence': e => describeDNAError(e.cause)`.
 * - Merged union (an outer union includes an inner union's variants directly): spread the
 *   inner arms record into the outer one, e.g. `makeDescriber({ ...MRNA_ERROR_ARMS, ... })`, so
 *   the inner variants are never re-enumerated and a new inner variant never forces an edit to
 *   the outer renderer.
 *
 * @param arms - A renderer per `kind`; the {@link DescriberArms} mapped type enforces that the
 * set of keys exactly matches the union's variants
 * @returns A function rendering any `E` value as a human-readable message
 * @typeParam E - The discriminated-union error type, discriminated on a string `kind` field
 */
export function makeDescriber<E extends { readonly kind: string }>(
  arms: DescriberArms<E>,
): (error: E) => string {
  /*
   * `error.kind` and its matching arm are correlated by construction, but inside this generic
   * TypeScript cannot prove the indexed arm accepts this specific `error`: each arm is narrowed
   * to its own variant (via `Extract`), so the union of arm types only accepts the impossible
   * intersection of their parameters. Narrowing the arms (so authors get each variant's payload)
   * and dispatching on the wide union are intrinsically at odds, so a single localized bridge
   * through `unknown` is required - the typed indexed-access pattern in `at.ts`. The public
   * `DescriberArms<E>` contract keeps the call site sound by checking that every `kind` has an
   * arm.
   */
  const lookup = arms as unknown as Readonly<Record<string, (error: E) => string>>;
  return (error: E): string => {
    const arm = lookup[error.kind];
    if (arm === undefined) {
      /*
       * Unreachable: `DescriberArms<E>` guarantees one arm per `kind`. This guards only against a
       * programmer error (a value whose `kind` lies about its type), never validated input.
       */
      throw new Error(`makeDescriber: no renderer registered for kind '${error.kind}'`);
    }
    return arm(error);
  };
}
