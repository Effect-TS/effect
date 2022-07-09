/**
 * A generator of maps of the specified size.
 *
 * @tsplus static effect/core/testing/Gen.Ops mapOfN
 */
export function mapOfN<R, K, R2, V>(
  n: number,
  key: Gen<R, K>,
  value: Gen<R2, V>
): Gen<R | R2, HashMap<K, V>> {
  return key.setOfN(n).zipWith(value.listOfN(n), (k, v) => HashMap.from(k.zip(v)))
}
