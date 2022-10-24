import type { Context } from "@fp-ts/data/Context"

/**
 * Propagates the success value to the second element of a tuple, but
 * passes the effect input `R` along unmodified as the first element
 * of the tuple.
 *
 * @tsplus getter effect/core/io/Effect onSecond
 * @category mutations
 * @since 1.0.0
 */
export function onSecond<R, E, A>(self: Effect<R, E, A>): Effect<R, E, readonly [Context<R>, A]> {
  return Effect.environment<R>().zip(self)
}
