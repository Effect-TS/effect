import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static ets/ManagedOps whenCase
 */
export function whenCase<R, E, A, B>(
  a: LazyArg<A>,
  pf: (a: A) => Option<Managed<R, E, B>>,
  __tsplusTrace?: string
): Managed<R, E, Option<B>> {
  return Managed.suspend(
    pf(a()).fold(
      () => Managed.none,
      (_) => _.asSome()
    )
  )
}
