import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * Returns a `Semigroup` instance for objects preserving their type
 *
 * @example
 * import { getObjectSemigroup } from 'fp-ts/lib/Semigroup'
 *
 * interface Person {
 *   name: string
 *   age: number
 * }
 *
 * const S = getObjectSemigroup<Person>()
 * assert.deepStrictEqual(S.concat({ name: 'name', age: 23 }, { name: 'name', age: 24 }), { name: 'name', age: 24 })
 *
 * @since 2.0.0
 */
export function getObjectSemigroup<A extends object = never>(): Semigroup<A> {
  return {
    concat: (x, y) => Object.assign({}, x, y)
  }
}
