// ets_tracing: off

import type { Either } from "../../Either"
import { left } from "../../Either"
import type { Effect } from "../definition"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to a left value.
 */
export function asLeft<R, E, A>(self: Effect<R, E, A>): Effect<R, E, Either<A, never>> {
  return map_(self, left)
}
