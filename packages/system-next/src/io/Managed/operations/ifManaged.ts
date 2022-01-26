import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @ets fluent ets/Managed ifManaged
 */
export function ifManaged_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  b: LazyArg<Managed<R2, E2, boolean>>,
  __etsTrace?: string
): Managed<R & R2, E | E2, Option<A>> {
  return Managed.suspend(
    b().flatMap((result) => (result ? self.asSome() : Managed.none))
  )
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @ets_data_first ifManaged_
 */
export function ifManaged<R2, E2>(
  b: () => Managed<R2, E2, boolean>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E | E2, Option<A>> =>
    ifManaged_(self, b)
}
