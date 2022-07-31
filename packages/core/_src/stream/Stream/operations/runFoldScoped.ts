import { constTrue } from "@tsplus/stdlib/data/Function"

/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFoldScoped
 * @tsplus pipeable effect/core/stream/Stream runFoldScoped
 */
export function runFoldScoped<S, A>(
  s: LazyArg<S>,
  f: (s: S, a: A) => S
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | Scope, E, S> =>
    self.runFoldWhileScoped(
      s,
      constTrue,
      f
    )
}
