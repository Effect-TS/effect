import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Converts an option on errors into an option on values.
 *
 * @ets fluent ets/Managed unsome
 */
export function unsome<R, E, A>(
  self: Managed<R, Option<E>, A>,
  __trace?: string
): Managed<R, E, Option<A>> {
  return self.foldManaged(
    (_) => _.fold(() => Managed.succeedNow(Option.none), Managed.failNow),
    (a) => Managed.succeedNow(Option.some(a)),
    __trace
  )
}
