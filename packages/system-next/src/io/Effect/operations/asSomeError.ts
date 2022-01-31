import type { Option } from "../../../data/Option"
import { some } from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Maps the error value of this effect to an optional value.
 *
 * @tsplus fluent ets/Effect asSomeError
 */
export function asSomeError<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, Option<E>, A> {
  return self.mapError(some)
}
