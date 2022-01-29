import type { LazyArg } from "../../../data/Function"
import * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * value, otherwise does nothing.
 *
 * @ets static ets/ManagedOps whenCase
 */
export function whenCase<R, E, A, B>(
  a: LazyArg<A>,
  pf: (a: A) => O.Option<Managed<R, E, B>>,
  __etsTrace?: string
): Managed<R, E, O.Option<B>> {
  return Managed.suspend(
    O.fold_(
      pf(a()),
      () => Managed.none,
      (_) => _.asSome()
    )
  )
}
