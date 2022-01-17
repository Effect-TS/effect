import type { Either } from "../../Either"
import { right } from "../../Either"
import type { Effect } from "../definition"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to a right value.
 */
export function asRight<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, E, Either<never, A>> {
  return map_(self, right)
}
