import { foldLeft as foldLeft_1 } from "../Readonly/Array/foldLeft"

/**
 * Break an array into its first element and remaining elements
 *
 * @example
 * import { foldLeft } from 'fp-ts/lib/Array'
 *
 * const len: <A>(as: Array<A>) => number = foldLeft(() => 0, (_, tail) => 1 + len(tail))
 * assert.strictEqual(len([1, 2, 3]), 3)
 *
 * @since 2.0.0
 */
export const foldLeft: <A, B>(
  onNil: () => B,
  onCons: (head: A, tail: Array<A>) => B
) => (as: Array<A>) => B = foldLeft_1 as any
