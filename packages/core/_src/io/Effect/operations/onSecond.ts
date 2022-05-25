/**
 * Propagates the success value to the second element of a tuple, but
 * passes the effect input `R` along unmodified as the first element
 * of the tuple.
 *
 * @tsplus fluent ets/Effect onSecond
 */
export function onSecond<R, E, A>(self: Effect<R, E, A>, __tsplusTrace?: string) {
  return Effect.environment<R>().zip(self)
}
