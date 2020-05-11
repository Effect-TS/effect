import type { Eq } from "./Eq"
import { fromEquals } from "./fromEquals"

/**
 * Given a tuple of `Eq`s returns a `Eq` for the tuple
 *
 * @example
 * import { getTupleEq, eqString, eqNumber, eqBoolean } from 'fp-ts/lib/Eq'
 *
 * const E = getTupleEq(eqString, eqNumber, eqBoolean)
 * assert.strictEqual(E.equals(['a', 1, true], ['a', 1, true]), true)
 * assert.strictEqual(E.equals(['a', 1, true], ['b', 1, true]), false)
 * assert.strictEqual(E.equals(['a', 1, true], ['a', 2, true]), false)
 * assert.strictEqual(E.equals(['a', 1, true], ['a', 1, false]), false)
 *
 * @since 2.0.0
 */
export function getTupleEq<T extends ReadonlyArray<Eq<any>>>(
  ...eqs: T
): Eq<
  {
    [K in keyof T]: T[K] extends Eq<infer A> ? A : never
  }
> {
  return fromEquals((x, y) => eqs.every((E, i) => E.equals(x[i], y[i])))
}
