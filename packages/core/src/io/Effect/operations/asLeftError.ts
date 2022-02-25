import { Either } from "../../../data/Either"
import type { Effect } from "../definition"

/**
 * Maps the error value of this effect to a left value.
 *
 * @tsplus fluent ets/Effect asLeftError
 */
export function asLeftError<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, Either<E, never>, A> {
  return self.mapError(Either.left)
}
