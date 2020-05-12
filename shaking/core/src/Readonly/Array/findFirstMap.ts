import type { Option } from "../../Option/Option"
import { isSome } from "../../Option/isSome"
import { none } from "../../Option/none"

/**
 * Find the first element returned by an option based selector function
 *
 * @example
 * import { findFirstMap } from 'fp-ts/lib/ReadonlyArray'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: ReadonlyArray<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the first person that has an age
 * assert.deepStrictEqual(findFirstMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Mary'))
 *
 * @since 2.5.0
 */
export function findFirstMap<A, B>(
  f: (a: A) => Option<B>
): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => {
    const len = as.length
    for (let i = 0; i < len; i++) {
      const v = f(as[i])
      if (isSome(v)) {
        return v
      }
    }
    return none
  }
}
