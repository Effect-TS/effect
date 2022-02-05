// ets_tracing: off

import type { Effect } from "./effect.js"
import { environment } from "./environment.js"
import { zip_ } from "./zip.js"

/**
 * Propagates the success value to the second element of a tuple, but
 * passes the effect input `R` along unmodified as the first element
 * of the tuple.
 */
export function onSecond<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return zip_(environment<R>(), self, __trace)
}
