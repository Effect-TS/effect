import type { Either } from "../../../data/Either"
import { right } from "../../../data/Either"
import type { Effect } from "../definition"
import { mapError_ } from "./mapError"

/**
 * Maps the error value of this effect to a right value.
 *
 * @ets fluent ets/Effect asRightError
 */
export function asRightError<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, Either<never, E>, A> {
  return mapError_(self, right)
}
