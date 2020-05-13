import { dropLeft as dropLeft_1 } from "../Readonly/Array/dropLeft"

/**
 * Drop a number of elements from the start of an array, creating a new array
 *
 * @example
 * import { dropLeft } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(dropLeft(2)([1, 2, 3]), [3])
 *
 * @since 2.0.0
 */
export const dropLeft: (n: number) => <A>(as: Array<A>) => Array<A> = dropLeft_1 as any
