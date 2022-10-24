import { constTrue } from "@fp-ts/data/Function"

/**
 * Executes a pure fold over the stream of values - reduces all elements in
 * the stream to a value of type `S`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFoldEffect
 * @tsplus pipeable effect/core/stream/Stream runFoldEffect
 * @category destructors
 * @since 1.0.0
 */
export function runFoldEffect<S, A, R2, E2>(
  s: S,
  f: (s: S, a: A) => Effect<R2, E2, S>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2, E | E2, S> =>
    Effect.scoped(self.runFoldWhileScopedEffect(s, constTrue, f))
}
