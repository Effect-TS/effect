import { fromCompare, Ord, ordNumber } from "../../Ord"

/**
 * Derives an `Ord` over the `ReadonlyArray` of a given element type from the `Ord` of that type. The ordering between two such
 * arrays is equal to: the first non equal comparison of each arrays elements taken pairwise in increasing order, in
 * case of equality over all the pairwise elements; the longest array is considered the greatest, if both arrays have
 * the same length, the result is equality.
 *
 * @example
 * import { getOrd } from 'fp-ts/lib/ReadonlyArray'
 * import { ordString } from 'fp-ts/lib/Ord'
 *
 * const O = getOrd(ordString)
 * assert.strictEqual(O.compare(['b'], ['a']), 1)
 * assert.strictEqual(O.compare(['a'], ['a']), 0)
 * assert.strictEqual(O.compare(['a'], ['b']), -1)
 *
 *
 * @since 2.5.0
 */
export function getOrd<A>(O: Ord<A>): Ord<ReadonlyArray<A>> {
  return fromCompare((a, b) => {
    const aLen = a.length
    const bLen = b.length
    const len = Math.min(aLen, bLen)
    for (let i = 0; i < len; i++) {
      const ordering = O.compare(a[i], b[i])
      if (ordering !== 0) {
        return ordering
      }
    }
    return ordNumber.compare(aLen, bLen)
  })
}
