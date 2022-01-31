import { Option } from "../../../data/Option"
import type { Managed } from "../definition"

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @tsplus fluent ets/Managed option
 */
export function option<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, never, Option<A>> {
  return self.fold(() => Option.none, Option.some)
}
