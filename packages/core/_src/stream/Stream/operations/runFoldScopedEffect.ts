import { constTrue } from "@tsplus/stdlib/data/Function"

/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFoldScopedEffect
 * @tsplus pipeable effect/core/stream/Stream runFoldScopedEffect
 */
export function runFoldScopedEffect<S, A, R2, E2>(
  s: S,
  f: (s: S, a: A) => Effect<R2, E2, S>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2 | Scope, E | E2, S> =>
    self.runFoldWhileScopedEffect(s, constTrue, f)
}
