/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream. Stops the fold early when the
 * condition is not fulfilled.
 *
 * @param cont A function which defines the early termination condition.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFoldWhileScoped
 * @tsplus pipeable effect/core/stream/Stream runFoldWhileScoped
 */
export function runFoldWhileScoped<S, A>(
  s: LazyArg<S>,
  cont: Predicate<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | Scope, E, S> =>
    self.runScoped(
      Sink.fold(s, cont, f)
    )
}
