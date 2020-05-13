import { rotate as rotate_1 } from "../Readonly/Array/rotate"

/**
 * Rotate an array to the right by `n` steps
 *
 * @example
 * import { rotate } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
 *
 * @since 2.0.0
 */
export const rotate: (n: number) => <A>(as: Array<A>) => Array<A> = rotate_1 as any
