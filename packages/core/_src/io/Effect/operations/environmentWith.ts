/**
 * Accesses the environment of the effect.
 *
 * @tsplus static effect/core/io/Effect.Ops environmentWith
 */
export function environmentWith<R, A>(f: (env: Env<R>) => A): Effect<R, never, A> {
  return Effect.environment<R>().map(f)
}
