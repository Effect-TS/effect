import type { Option } from "../../../data/Option"
import { some } from "../../../data/Option"
import type { Effect } from "../definition"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to an optional value.
 *
 * @ets fluent ets/Effect asSome
 */
export function asSome<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, Option<A>> {
  return map_(self, some, __trace)
}
