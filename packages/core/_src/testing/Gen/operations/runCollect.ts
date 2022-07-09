/**
 * Runs the generator and collects all of its values in a chunk.
 *
 * @tsplus getter effect/core/testing/Gen runCollect
 */
export function runCollect<R, A>(self: Gen<R, A>): Effect<R, never, Chunk<A>> {
  return self.sample.collectSome.map((sample) => sample.value).runCollect
}
