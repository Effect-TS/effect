/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream. Stops the fold early when
 * the condition is not fulfilled.
 *
 * @param cont A function which defines the early termination condition.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFoldWhileScopedEffect
 * @tsplus pipeable effect/core/stream/Stream runFoldWhileScopedEffect
 */
export function runFoldWhileScopedEffect<S, A, R2, E2>(
  s: LazyArg<S>,
  cont: Predicate<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2 | Scope, E | E2, S> =>
    self.runScoped(
      Sink.foldEffect(s, cont, f)
    )
}
