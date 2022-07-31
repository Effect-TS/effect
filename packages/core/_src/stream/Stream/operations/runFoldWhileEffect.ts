/**
 * Reduces the elements in the stream to a value of type `S`. Stops the fold
 * early when the condition is not fulfilled.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFoldWhileEffect
 * @tsplus pipeable effect/core/stream/Stream runFoldWhileEffect
 */
export function runFoldWhileEffect<S, A, R2, E2>(
  s: LazyArg<S>,
  cont: Predicate<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2, E | E2, S> =>
    Effect.scoped(self.runFoldWhileScopedEffect(s, cont, f))
}
