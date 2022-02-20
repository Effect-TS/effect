import { Either } from "../../../data/Either"
import type { Effect } from "../definition"

/**
 * Maps the success value of this effect to a right value.
 *
 * @tsplus fluent ets/Effect asRight
 */
export function asRight<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, Either<never, A>> {
  return self.map(Either.right)
}
