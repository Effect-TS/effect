/**
 * Maps an effectual function over a generator.
 *
 * @tsplus static effect/core/testing/Gen.Aspects mapEffect
 * @tsplus pipeable effect/core/testing/Gen mapEffect
 */
export function mapEffect<A, R2, B>(f: (a: A) => Effect<R2, never, B>) {
  return <R>(self: Gen<R, A>): Gen<R | R2, B> =>
    Gen(self.sample.mapEffect(
      (maybe) => Effect.forEachMaybe(maybe, (sample) => sample.forEach(f))
    ))
}
