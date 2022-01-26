import * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Converts an option on errors into an option on values.
 *
 * @ets fluent ets/Managed unsome
 */
export function unsome<R, E, A>(
  self: Managed<R, O.Option<E>, A>,
  __trace?: string
): Managed<R, E, O.Option<A>> {
  return self.foldManaged(
    O.fold(() => Managed.succeedNow(O.none), Managed.failNow),
    (a) => Managed.succeedNow(O.some(a)),
    __trace
  )
}
