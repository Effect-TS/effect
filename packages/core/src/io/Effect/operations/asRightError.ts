import { Either } from "../../../data/Either"
import type { Effect } from "../definition"

/**
 * Maps the error value of this effect to a right value.
 *
 * @tsplus fluent ets/Effect asRightError
 */
export function asRightError<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, Either<never, E>, A> {
  return self.mapError(Either.right)
}
