import type { Option } from "../../Option"
import { some } from "../../Option"
import type { Effect } from "../definition"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, Option<A>> {
  return map_(self, some, __trace)
}
