/**
 * Rotate an array to the right by `n` steps
 *
 * @example
 * import { rotate } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
 *
 * @since 2.5.0
 */
export function rotate(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const len = as.length
    if (n === 0 || len <= 1 || len === Math.abs(n)) {
      return as
    } else if (n < 0) {
      return rotate(len + n)(as)
    } else {
      return as.slice(-n).concat(as.slice(0, len - n))
    }
  }
}
