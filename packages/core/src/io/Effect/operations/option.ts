import { Option } from "../../../data/Option"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @tsplus fluent ets/Effect option
 */
export function option<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): RIO<R, Option<A>> {
  return self.foldEffect(
    () => Effect.succeedNow(Option.none),
    (a) => Effect.succeedNow(Option.some(a))
  )
}
