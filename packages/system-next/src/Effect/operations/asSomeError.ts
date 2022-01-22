import type { Option } from "../../Option"
import { some } from "../../Option"
import type { Effect } from "../definition"
import { mapError_ } from "./mapError"

/**
 * Maps the error value of this effect to an optional value.
 *
 * @ets fluent ets/Effect asSome
 */
export function asSomeError<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, Option<E>, A> {
  return mapError_(self, some, __trace)
}
