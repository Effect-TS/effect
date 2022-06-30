/**
 * Returns a new layer whose output is mapped by the specified function.
 *
 * @tsplus static effect/core/io/Layer.Aspects map
 * @tsplus pipeable effect/core/io/Layer map
 */
export function map<A, B>(f: (a: Env<A>) => Env<B>) {
  return <R, E>(self: Layer<R, E, A>): Layer<R, E, B> =>
    self.flatMap(
      (a) => Layer.succeedEnvironment(f(a))
    )
}
