/**
 * Reduces the elements in the stream to a value of type `S`. Stops the fold
 * early when the condition is not fulfilled.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFoldWhile
 * @tsplus pipeable effect/core/stream/Stream runFoldWhile
 */
export function runFoldWhile<S, A>(
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => S
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R, E, S> =>
    Effect.scoped(
      self.runFoldWhileScoped(s, cont, f)
    )
}
