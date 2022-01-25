import * as O from "../../../data/Option"
import type { Effect, RIO } from "../definition"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @ets fluent ets/Effect option
 */
export function option<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): RIO<R, O.Option<A>> {
  return foldEffect_(
    self,
    () => succeedNow(O.none),
    (a) => succeedNow(O.some(a)),
    __etsTrace
  )
}
