/**
 * Discriminated-union result type carrying either a successful payload or a failure error.
 *
 * A `Result<T, E>` is either:
 * - {@link SuccessResult} - carries a `data: T` payload, with `success === true`
 * - {@link FailureResult} - carries an `error: E` payload, with `success === false`
 *
 * Designed so that `if (result.success)` narrows the type to the success branch (and vice
 * versa), preserving the discriminated-union ergonomics. Each branch additionally carries
 * fluent methods (`map`, `chain`, `unwrap`, etc.) for transforming and unwrapping results.
 *
 * Construct via {@link success} / {@link failure}.
 *
 * @typeParam T - Type of the data carried on success
 * @typeParam E - Type of the error carried on failure (defaults to `string`)
 */
export type Result<T, E = string> = SuccessResult<T, E> | FailureResult<T, E>;

/**
 * Successful branch of {@link Result}. Carries a `data: T` payload.
 *
 * This class and {@link FailureResult} together form the discriminated union {@link Result};
 * they live in the same file (slightly bending the one-class-per-file convention) because
 * they are a single conceptual type, separated into two case classes only so that the
 * `success` literal-typed discriminator can drive type narrowing.
 *
 * Both case classes are parameterized by `<T, E>` even though `SuccessResult` does not carry
 * an error payload; this keeps the method signatures (e.g. `match`, `map`, `chain`) identical
 * on both branches so the union narrows cleanly under direct method calls.
 *
 * @typeParam T - Type of the data carried
 * @typeParam E - Type of the error the matching {@link FailureResult} branch would carry;
 * defaults to `never` since a success has no error payload to inhabit it
 */
export class SuccessResult<T, E = never> {
  /** Discriminator marking this as a successful result. */
  public readonly success = true as const;

  /**
   * @param data - The successful payload
   */
  constructor(public readonly data: T) {}

  /**
   * Type predicate identifying this as a {@link SuccessResult}.
   *
   * @returns Always `true`
   */
  isSuccess(): this is SuccessResult<T, E> {
    return true;
  }

  /**
   * Type predicate identifying this as a {@link FailureResult}.
   *
   * @returns Always `false` for a {@link SuccessResult}
   */
  isFailure(): false {
    return false;
  }

  /**
   * Transforms the data payload through `mapper`.
   *
   * @param mapper - Function applied to the data
   * @returns A new {@link SuccessResult} wrapping the mapped value
   * @typeParam U - Type of the mapped value
   */
  map<U>(mapper: (data: T) => U): SuccessResult<U, E> {
    return new SuccessResult<U, E>(mapper(this.data));
  }

  /**
   * Chains another result-producing operation onto this success.
   *
   * @param mapper - Function applied to the data, returning a new {@link Result}
   * @returns The {@link Result} produced by `mapper`, widened so its error type unions with E
   * @typeParam U - Data type of the chained result
   * @typeParam E2 - Error type of the chained result
   */
  chain<U, E2>(mapper: (data: T) => Result<U, E2>): Result<U, E | E2> {
    return mapper(this.data);
  }

  /**
   * Transforms the error type. No-op for a success, since there is no error to map.
   *
   * @returns This success carried over with the new error-type parameter
   * @typeParam E2 - Type of the transformed error
   */
  mapError<E2>(_: (error: E) => E2): SuccessResult<T, E2> {
    return new SuccessResult<T, E2>(this.data);
  }

  /**
   * Extracts the data payload.
   *
   * @returns The data payload
   */
  unwrap(): T {
    return this.data;
  }

  /**
   * Extracts the data payload. The provided default is ignored for a success.
   *
   * @returns The data payload
   */
  unwrapOr(_: T): T {
    return this.data;
  }

  /**
   * Branches on success vs failure, applying the appropriate handler.
   *
   * @param handlers - Object with `success` and `failure` handler functions
   * @returns The result of the `success` handler
   * @typeParam R - Return type of the handler functions
   */
  match<R>(handlers: {
    /** Handler invoked with the data payload on success. */
    success: (data: T) => R;
    /** Handler invoked with the error payload on failure (unused for a success). */
    failure: (error: E) => R;
  }): R {
    return handlers.success(this.data);
  }
}

/**
 * Failure branch of {@link Result}. Carries an `error: E` payload.
 *
 * See {@link SuccessResult} for design notes on the two-class layout.
 *
 * @typeParam T - Type of the data the matching {@link SuccessResult} branch would carry; carried
 * for shape-consistency with the success branch so methods unify on the union
 * @typeParam E - Type of the error carried
 */
export class FailureResult<T, E> {
  /** Discriminator marking this as a failed result. */
  public readonly success = false as const;

  /**
   * @param error - The failure payload
   */
  constructor(public readonly error: E) {}

  /**
   * Type predicate identifying this as a {@link SuccessResult}.
   *
   * @returns Always `false` for a {@link FailureResult}
   */
  isSuccess(): false {
    return false;
  }

  /**
   * Type predicate identifying this as a {@link FailureResult}.
   *
   * @returns Always `true`
   */
  isFailure(): this is FailureResult<T, E> {
    return true;
  }

  /**
   * Transforms the data payload through `mapper`. No-op for a failure.
   *
   * @returns This failure carried over with the new data-type parameter
   * @typeParam U - Type the data would have been mapped to
   */
  map<U>(_: (data: T) => U): FailureResult<U, E> {
    return new FailureResult<U, E>(this.error);
  }

  /**
   * Chains another result-producing operation. No-op for a failure.
   *
   * @returns This failure widened so its result-type parameter accommodates the chain
   * @typeParam U - Data type of the chained result (unused)
   * @typeParam E2 - Error type of the chained result (joined into the return type)
   */
  chain<U, E2>(_: (data: T) => Result<U, E2>): Result<U, E | E2> {
    return new FailureResult<U, E>(this.error);
  }

  /**
   * Transforms the error payload through `mapper`.
   *
   * @param mapper - Function applied to the error
   * @returns A new {@link FailureResult} carrying the transformed error
   * @typeParam E2 - Type of the transformed error
   */
  mapError<E2>(mapper: (error: E) => E2): FailureResult<T, E2> {
    return new FailureResult<T, E2>(mapper(this.error));
  }

  /**
   * Throws an Error built from the failure payload. When the payload is a non-string
   * (typically a structured tagged-union error), the original payload is preserved on the
   * thrown Error's `cause` so callers catching the throw can recover the structured data.
   *
   * @returns Never; always throws.
   * @throws Always. The thrown Error's message is the string form of the error payload, or a
   * generic "Result is a failure" message if the payload is not a string; in the latter case
   * the structured payload is attached as the thrown Error's `cause`.
   */
  unwrap(): never {
    if (typeof this.error === 'string') {
      throw new Error(this.error);
    }
    throw new Error('Result is a failure', { cause: this.error });
  }

  /**
   * Returns the provided default value.
   *
   * @param defaultValue - The value to return
   * @returns `defaultValue`
   */
  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Branches on success vs failure, applying the appropriate handler.
   *
   * @param handlers - Object with `success` and `failure` handler functions
   * @returns The result of the `failure` handler
   * @typeParam R - Return type of the handler functions
   */
  match<R>(handlers: {
    /** Handler invoked with the data payload on success (unused for a failure). */
    success: (data: T) => R;
    /** Handler invoked with the error payload on failure. */
    failure: (error: E) => R;
  }): R {
    return handlers.failure(this.error);
  }
}

/**
 * Constructs a successful {@link Result}.
 *
 * @param data - The successful payload
 * @returns A {@link SuccessResult} wrapping `data`
 * @typeParam T - Type of the data
 */
export function success<T>(data: T): SuccessResult<T, never> {
  return new SuccessResult<T, never>(data);
}

/**
 * Constructs a failed {@link Result}.
 *
 * @param error - The failure payload
 * @returns A {@link FailureResult} wrapping `error`
 * @typeParam E - Type of the error
 */
export function failure<E>(error: E): FailureResult<never, E> {
  return new FailureResult<never, E>(error);
}
