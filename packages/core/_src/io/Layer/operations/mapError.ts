/**
 * Returns a layer with its error channel mapped using the specified function.
 *
 * @tsplus static effect/core/io/Layer.Aspects mapError
 * @tsplus pipeable effect/core/io/Layer mapError
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(self: Layer<R, E, A>): Layer<R, E1, A> => self.catchAll((e) => Layer.fail(f(e)))
}
