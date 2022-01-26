import * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Requires the option produced by this value to be `None`.
 *
 * @ets fluent ets/Managed asNone
 */
export function asNone<R, E, A>(
  self: Managed<R, E, O.Option<A>>,
  __etsTrace?: string
): Managed<R, O.Option<E>, void> {
  return self.foldManaged(
    (e) => Managed.failNow(O.some(e)),
    O.fold(
      () => Managed.failNow(O.none),
      () => Managed.succeedNow(undefined)
    )
  )
}
