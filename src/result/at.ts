/**
 * Indexed access helper for sites where the index is proven in-bounds by an upstream
 * invariant (a loop bound, a length check, a structural guarantee). With
 * `noUncheckedIndexedAccess` enabled, `arr[i]` widens to `T | undefined`; this helper
 * narrows it back to `T` and throws a precise `RangeError` if the contract is violated -
 * which can only happen on a programmer error, not a runtime input failure.
 *
 * Use this where the surrounding code already establishes the index is valid. Where the
 * index might legitimately miss (e.g. a hash-table lookup that may not find a key), use
 * the plain `?? fallback` or explicit `undefined` check instead - those cases are real
 * branching logic, not invariant assertions.
 *
 * Two overloads cover the common cases: array-style numeric index, and record-style string
 * key.
 *
 * @param target - The array or record to index into
 * @param key - The numeric index (arrays) or string key (records)
 * @returns The element at `target[key]`
 * @throws `RangeError` if `target[key]` is `undefined`
 *
 * @example
 * ```typescript
 * for (let i = 0; i < items.length; i++) {
 *   const item = at(items, i); // narrowed to T, no per-iteration undefined guard needed
 *   ...
 * }
 * ```
 */
export function at<T>(target: readonly T[], key: number): T;
export function at<T>(target: Readonly<Record<string, T>>, key: string): T;
export function at<T>(target: readonly T[] | Readonly<Record<string, T>>, key: number | string): T {
  const value = (target as Readonly<Record<string | number, T | undefined>>)[key];
  if (value === undefined) {
    const length = Array.isArray(target) ? target.length : Object.keys(target).length;
    throw new RangeError(
      `Indexed access at[${String(key)}] returned undefined; container has ${length} entries`,
    );
  }
  return value;
}
