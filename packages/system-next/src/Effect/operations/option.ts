import * as O from "../../Option"
import type { Effect, RIO } from "../definition"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 */
export function option<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): RIO<R, O.Option<A>> {
  return foldEffect_(
    self,
    () => succeedNow(O.none),
    (a) => succeedNow(O.some(a)),
    __trace
  )
}
