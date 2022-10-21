/**
 * Propagates the success value to the first element of a tuple, but
 * passes the effect input `R` along unmodified as the second element
 * of the tuple.
 *
 * @tsplus getter effect/core/io/Effect onFirst
 */
export function onFirst<R, E, A>(self: Effect<R, E, A>): Effect<R, E, readonly [A, Env<R>]> {
  return self.zip(Effect.environment<R>())
}
