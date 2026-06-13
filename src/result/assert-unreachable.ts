/**
 * Throws an error when invoked with a non-`never` value. Place in the `default` branch of a
 * discriminated-union `switch` to make the type checker fail the build the moment a new
 * variant is added without a corresponding branch.
 *
 * The thrown error is a programmer-error trap: reaching this branch means either the
 * discriminator's type was lying or a new variant was forgotten. It is not a `Result`-style
 * failure for callers to catch.
 *
 * @param value - The exhaustively-narrowed value
 * @returns Never; always throws
 * @throws Always. The thrown Error's message includes a JSON-serialized form of `value` so
 * the missing variant's `kind` is recoverable from logs.
 */
export function assertUnreachable(value: never): never {
  throw new Error(`Unhandled discriminated-union case: ${JSON.stringify(value)}`);
}
