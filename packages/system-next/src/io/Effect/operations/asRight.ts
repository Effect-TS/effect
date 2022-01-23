import type { Either } from "../../../data/Either"
import { right } from "../../../data/Either"
import type { Effect } from "../definition"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to a right value.
 *
 * @ets fluent ets/Effect asRight
 */
export function asRight<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, E, Either<never, A>> {
  return map_(self, right)
}
