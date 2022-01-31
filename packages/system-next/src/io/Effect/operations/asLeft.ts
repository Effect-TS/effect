import type { Either } from "../../../data/Either"
import { left } from "../../../data/Either"
import type { Effect } from "../definition"

/**
 * Maps the success value of this effect to a left value.
 *
 * @ets fluent ets/Effect asLeft
 */
export function asLeft<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, Either<A, never>> {
  return self.map(left)
}
