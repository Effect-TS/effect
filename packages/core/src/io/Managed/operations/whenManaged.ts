import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @tsplus fluent ets/Managed whenManaged
 */
export function whenManaged_<R, E, A, R1, E1>(
  self: Managed<R, E, A>,
  b: LazyArg<Managed<R1, E1, boolean>>,
  __tsplusTrace?: string
): Managed<R & R1, E | E1, Option<A>> {
  return Managed.suspend(
    b().flatMap((result) => (result ? self.asSome() : Managed.none))
  )
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @ets_data_first whenManaged_
 */
export function whenManaged<R1, E1>(
  b: LazyArg<Managed<R1, E1, boolean>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, Option<A>> =>
    whenManaged_(self, b)
}
