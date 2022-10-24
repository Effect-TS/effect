import { pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

/**
 * A generator of maps of the specified size.
 *
 * @tsplus static effect/core/testing/Gen.Ops mapOfN
 * @category constructors
 * @since 1.0.0
 */
export function mapOfN<R, K, R2, V>(
  n: number,
  key: Gen<R, K>,
  value: Gen<R2, V>
): Gen<R | R2, HashMap.HashMap<K, V>> {
  return key.setOfN(n).zipWith(
    value.listOfN(n),
    (keys, values) =>
      HashMap.from(pipe(
        Array.from(keys),
        ReadonlyArray.zip(Array.from(values))
      ))
  )
}
