import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus fluent ets/Managed unlessManaged
 */
export function unlessManaged_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  b: LazyArg<Managed<R2, E2, boolean>>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, Option<A>> {
  return Managed.suspend(
    b().flatMap((result) => (result ? Managed.none : self.asSome()))
  )
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @ets_data_first unlessManaged_
 */
export function unlessManaged<R2, E2>(
  b: LazyArg<Managed<R2, E2, boolean>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E | E2, Option<A>> =>
    unlessManaged_(self, b)
}
