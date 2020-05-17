import { replicate as replicate_1 } from "../Readonly/Array/replicate"

/**
 * Create an array containing a value repeated the specified number of times
 *
 * @example
 * import { replicate } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(replicate(3, 'a'), ['a', 'a', 'a'])
 */
export const replicate: <A>(n: number, a: A) => Array<A> = replicate_1 as any
