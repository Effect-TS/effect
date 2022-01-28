import * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Converts an option on values into an option on errors.
 *
 * @ets fluent ets/Managed someError
 */
export function someError<R, E, A>(
  self: Managed<R, E, O.Option<A>>,
  __etsTrace?: string
): Managed<R, O.Option<E>, A> {
  return self.foldManaged(
    (e) => Managed.fail(O.some(e)),
    (oa) => O.fold_(oa, () => Managed.fail(O.emptyOf<E>()), Managed.succeedNow)
  )
}
