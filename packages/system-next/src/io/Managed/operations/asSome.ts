import { Option } from "../../../data/Option"
import type { Managed } from "../definition"

/**
 * Maps the success value of this effect to an optional value.
 *
 * @tsplus fluent ets/Managed asSome
 */
export function asSome<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, E, Option<A>> {
  return self.map(Option.some)
}
