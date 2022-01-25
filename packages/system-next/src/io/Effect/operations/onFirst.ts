import type { Effect } from "../definition"
import { environment } from "./environment"
import { zip_ } from "./zip"

/**
 * Propagates the success value to the first element of a tuple, but
 * passes the effect input `R` along unmodified as the second element
 * of the tuple.
 *
 * @ets fluent ets/Effect onFirst
 */
export function onFirst<R, E, A>(self: Effect<R, E, A>, __etsTrace?: string) {
  return zip_(self, environment<R>(), __etsTrace)
}
