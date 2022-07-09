/**
 * Runs the generator returning the first value of the generator.
 *
 * @tsplus getter effect/core/testing/Gen runHead
 */
export function runHead<R, A>(self: Gen<R, A>): Effect<R, never, Maybe<A>> {
  return self.sample.collectSome.map((sample) => sample.value).runHead
}
