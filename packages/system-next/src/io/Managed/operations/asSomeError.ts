import * as O from "../../../data/Option"
import type { Managed } from "../definition"

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, O.Option<E>, A> {
  return self.mapError(O.some)
}
