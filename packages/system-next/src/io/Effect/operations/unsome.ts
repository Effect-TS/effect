import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { failNow } from "./failNow"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Converts an option on errors into an option on values.
 *
 * @ets fluent ets/Effect unsome
 */
export function unsome<R, E, A>(
  self: Effect<R, O.Option<E>, A>,
  __etsTrace?: string
): Effect<R, E, O.Option<A>> {
  return foldEffect_(
    self,
    (e) => O.fold_(e, () => succeedNow(O.none), failNow),
    (a) => succeedNow(O.some(a)),
    __etsTrace
  )
}
