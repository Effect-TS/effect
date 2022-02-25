import { Option } from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Maps the success value of this effect to an optional value.
 *
 * @tsplus fluent ets/Effect asSome
 */
export function asSome<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, Option<A>> {
  return self.map(Option.some)
}
