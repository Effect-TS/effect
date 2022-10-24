import type { Context } from "@fp-ts/data/Context"
/**
 * Accesses the environment of the effect.
 *
 * @tsplus static effect/core/io/Effect.Ops environmentWith
 * @category environment
 * @since 1.0.0
 */
export function environmentWith<R, A>(f: (context: Context<R>) => A): Effect<R, never, A> {
  return Effect.environment<R>().map(f)
}
