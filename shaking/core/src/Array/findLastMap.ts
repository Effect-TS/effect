import type { Option } from "../Option/Option"
import { findLastMap as findLastMap_1 } from "../Readonly/Array/findLastMap"

/**
 * Find the last element returned by an option based selector function
 *
 * @example
 * import { findLastMap } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: Array<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the last person that has an age
 * assert.deepStrictEqual(findLastMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Joey'))
 *
 * @since 2.0.0
 */
export const findLastMap: <A, B>(
  f: (a: A) => Option<B>
) => (as: Array<A>) => Option<B> = findLastMap_1
