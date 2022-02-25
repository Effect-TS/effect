import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus fluent ets/Managed someOrFail
 */
export function someOrFail_<R, E, A, E1>(
  self: Managed<R, E, Option<A>>,
  e: LazyArg<E1>,
  __tsplusTrace?: string
) {
  return self.flatMap((_) => _.fold(() => Managed.fail(e), Managed.succeedNow))
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @ets_data_first someOrFail_
 */
export function someOrFail<E1>(e: LazyArg<E1>, __tsplusTrace?: string) {
  return <R, E, A>(self: Managed<R, E, Option<A>>): Managed<R, E1 | E, A> =>
    someOrFail_(self, e)
}
