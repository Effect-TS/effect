import type { Effect } from "../definition"
import { environment } from "./environment"
import { zip_ } from "./zip"

/**
 * Propagates the success value to the second element of a tuple, but
 * passes the effect input `R` along unmodified as the first element
 * of the tuple.
 *
 * @ets fluent ets/Effect onSecond
 */
export function onSecond<R, E, A>(self: Effect<R, E, A>, __etsTrace?: string) {
  return zip_(environment<R>(), self, __etsTrace)
}
