import type { Eq } from "fp-ts/lib/Eq"
import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"

/**
 * @example
 * import { none, some, getEq } from 'fp-ts/lib/Option'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * const E = getEq(eqNumber)
 * assert.strictEqual(E.equals(none, none), true)
 * assert.strictEqual(E.equals(none, some(1)), false)
 * assert.strictEqual(E.equals(some(1), none), false)
 * assert.strictEqual(E.equals(some(1), some(2)), false)
 * assert.strictEqual(E.equals(some(1), some(1)), true)
 *
 * @since 2.0.0
 */
export function getEq<A>(E: Eq<A>): Eq<Option<A>> {
  return {
    equals: (x, y) =>
      x === y ||
      (isNone(x) ? isNone(y) : isNone(y) ? false : E.equals(x.value, y.value))
  }
}
