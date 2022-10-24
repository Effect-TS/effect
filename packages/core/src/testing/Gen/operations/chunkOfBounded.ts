import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * A generator of chunks whose size falls within the specified bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops chunkOfBounded
 * @tsplus static effect/core/testing/Gen.Aspects chunkOfBounded
 * @tsplus pipeable effect/core/testing/Gen chunkOfBounded
 * @category mutations
 * @since 1.0.0
 */
export function chunkOfBounded(min: number, max: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, Chunk<A>> =>
    Gen.bounded(
      min,
      max,
      (n) => self.chunkOfN(n)
    )
}
