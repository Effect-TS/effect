import type { Effect } from "."
import { environment } from "./environment"
import { zip_ } from "./zip_"

/**
 * Propagates the success value to the first element of a tuple, but
 * passes the effect input `R` along unmodified as the second element
 * of the tuple.
 */
export function onFirst<R, E, A>(self: Effect<R, E, A>) {
  return zip_(self, environment<R>())
}
