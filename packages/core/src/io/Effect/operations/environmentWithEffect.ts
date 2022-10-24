import type { Context } from "@fp-ts/data/Context"

/**
 * Effectually accesses the environment of the effect.
 *
 * @tsplus static effect/core/io/Effect.Ops environmentWithEffect
 * @category environment
 * @since 1.0.0
 */
export function environmentWithEffect<R, R0, E, A>(
  f: (context: Context<R0>) => Effect<R, E, A>
): Effect<R | R0, E, A> {
  return Effect.environment<R0>().flatMap(f)
}
