import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Composes this generator with the specified generator to create a cartesian
 * product of elements and flattens the output.
 *
 * @tsplus static effect/core/testing/Gen.Aspects zipFlatten
 * @tsplus pipeable effect/core/testing/Gen zipFlatten
 */
export function zipFlatten<R2, A2>(that: Gen<R2, A2>) {
  return <R, A>(self: Gen<R, A>): Gen<R | R2, MergeTuple<A, A2>> =>
    self.zipWith(
      that,
      Tuple.mergeTuple
    )
}
