import { dropRight as dropRight_1 } from "../Readonly/Array/dropRight"

/**
 * Drop a number of elements from the end of an array, creating a new array
 *
 * @example
 * import { dropRight } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
 *
 * @since 2.0.0
 */
export const dropRight: (
  n: number
) => <A>(as: Array<A>) => Array<A> = dropRight_1 as any
