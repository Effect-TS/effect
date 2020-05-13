import { splitAt as splitAt_1 } from "../Readonly/Array/splitAt"

/**
 * Splits an array into two pieces, the first piece has `n` elements.
 *
 * @example
 * import { splitAt } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(splitAt(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4, 5]])
 *
 * @since 2.0.0
 */
export const splitAt: (
  n: number
) => <A>(as: Array<A>) => [Array<A>, Array<A>] = splitAt_1 as any
