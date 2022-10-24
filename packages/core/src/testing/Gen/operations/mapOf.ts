import type { HashMap } from "@fp-ts/data/HashMap"

/**
 * A sized generator of maps.
 *
 * @tsplus static effect/core/testing/Gen.Ops mapOf
 * @category constructors
 * @since 1.0.0
 */
export function mapOf<R, K, R2, V>(
  key: Gen<R, K>,
  value: Gen<R, V>
): Gen<R | R2 | Sized, HashMap<K, V>> {
  return Gen.small((n) => Gen.mapOfN(n, key, value))
}
