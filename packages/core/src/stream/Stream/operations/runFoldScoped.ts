import { constTrue } from "@fp-ts/data/Function"

/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFoldScoped
 * @tsplus pipeable effect/core/stream/Stream runFoldScoped
 * @category destructors
 * @since 1.0.0
 */
export function runFoldScoped<S, A>(
  s: S,
  f: (s: S, a: A) => S
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | Scope, E, S> =>
    self.runFoldWhileScoped(s, constTrue, f)
}
