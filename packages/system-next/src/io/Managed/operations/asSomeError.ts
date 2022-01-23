import * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { mapError_ } from "./mapError"

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, O.Option<E>, A> {
  return mapError_(self, O.some, __trace)
}
