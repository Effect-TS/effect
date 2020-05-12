import { isEmpty } from "./isEmpty"

/**
 * Break an array into its first element and remaining elements
 *
 * @example
 * import { foldLeft } from 'fp-ts/lib/ReadonlyArray'
 *
 * const len: <A>(as: ReadonlyArray<A>) => number = foldLeft(() => 0, (_, tail) => 1 + len(tail))
 * assert.strictEqual(len([1, 2, 3]), 3)
 *
 * @since 2.5.0
 */
export function foldLeft<A, B>(
  onNil: () => B,
  onCons: (head: A, tail: ReadonlyArray<A>) => B
): (as: ReadonlyArray<A>) => B {
  return (as) => (isEmpty(as) ? onNil() : onCons(as[0], as.slice(1)))
}
