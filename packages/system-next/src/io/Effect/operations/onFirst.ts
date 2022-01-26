import { Effect } from "../definition"

/**
 * Propagates the success value to the first element of a tuple, but
 * passes the effect input `R` along unmodified as the second element
 * of the tuple.
 *
 * @ets fluent ets/Effect onFirst
 */
export function onFirst<R, E, A>(self: Effect<R, E, A>, __etsTrace?: string) {
  return self.zip(Effect.environment<R>(), __etsTrace)
}
