import { makeBy } from "./makeBy"

/**
 * Create an array containing a value repeated the specified number of times
 *
 * @example
 * import { replicate } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(replicate(3, 'a'), ['a', 'a', 'a'])
 *
 * @since 2.5.0
 */
export function replicate<A>(n: number, a: A): ReadonlyArray<A> {
  return makeBy(n, () => a)
}
