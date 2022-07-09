/**
 * A generator of maps whose size falls within the specified bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops mapOfBounded
 */
export function mapOfBounded<R, K, R2, V>(
  min: number,
  max: number,
  key: Gen<R, K>,
  value: Gen<R2, V>
): Gen<R | R2, HashMap<K, V>> {
  return Gen.bounded(min, max, (n) => Gen.mapOfN(n, key, value))
}
