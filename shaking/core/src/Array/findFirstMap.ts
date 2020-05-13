import type { Option } from "../Option/Option"
import { findFirstMap as findFirstMap_1 } from "../Readonly/Array/findFirstMap"

/**
 * Find the first element returned by an option based selector function
 *
 * @example
 * import { findFirstMap } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: Array<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the first person that has an age
 * assert.deepStrictEqual(findFirstMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Mary'))
 *
 * @since 2.0.0
 */
export const findFirstMap: <A, B>(
  f: (a: A) => Option<B>
) => (as: Array<A>) => Option<B> = findFirstMap_1
