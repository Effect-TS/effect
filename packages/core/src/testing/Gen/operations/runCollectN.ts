import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Repeatedly runs the generator and collects the specified number of values
 * in a chunk.
 *
 * @tsplus static effect/core/testing/Gen.Aspects runCollectN
 * @tsplus pipeable effect/core/testing/Gen runCollectN
 * @category destructors
 * @since 1.0.0
 */
export function runCollectN(n: number) {
  return <R, A>(self: Gen<R, A>): Effect<R, never, Chunk<A>> =>
    self.sample
      .collectSome
      .map((sample) => sample.value)
      .forever
      .take(n)
      .runCollect
}
