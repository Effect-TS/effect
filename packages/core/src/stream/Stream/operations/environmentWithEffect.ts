import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the environment of the stream in the context of an effect.
 *
 * @tsplus static effect/core/stream/Stream.Ops environmentWithEffect
 * @category environment
 * @since 1.0.0
 */
export function environmentWithEffect<R0, R, E, A>(
  f: (context: Context<R0>) => Effect<R, E, A>
): Stream<R0 | R, E, A> {
  return Stream.environment<R0>().mapEffect(f)
}
