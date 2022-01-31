import * as O from "../../../data/Option"
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
  __etsTrace?: string
): RIO<R, O.Option<A>> {
  return self.foldEffect(
    () => Effect.succeedNow(O.none),
    (a) => Effect.succeedNow(O.some(a)),
    __etsTrace
  )
}
