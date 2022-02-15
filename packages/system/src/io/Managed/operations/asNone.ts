import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus fluent ets/Managed asNone
 */
export function asNone<R, E, A>(
  self: Managed<R, E, Option<A>>,
  __etsTrace?: string
): Managed<R, Option<E>, void> {
  return self.foldManaged(
    (e) => Managed.failNow(Option.some(e)),
    (_) =>
      _.fold(
        () => Managed.failNow(Option.none),
        () => Managed.succeedNow(undefined)
      )
  )
}
