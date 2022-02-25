import { Option } from "../../../data/Option"
import type { Managed } from "../definition"

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, Option<E>, A> {
  return self.mapError(Option.some)
}
