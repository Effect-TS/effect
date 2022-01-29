import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Converts an option on values into an option on errors.
 *
 * @ets fluent ets/Managed someError
 */
export function someError<R, E, A>(
  self: Managed<R, E, Option<A>>,
  __etsTrace?: string
): Managed<R, Option<E>, A> {
  return self.foldManaged(
    (e) => Managed.fail(Option.some(e)),
    (oa) => oa.fold(() => Managed.fail(Option.emptyOf<E>()), Managed.succeedNow)
  )
}
