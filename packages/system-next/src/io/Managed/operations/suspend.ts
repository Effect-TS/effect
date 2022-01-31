import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Returns a lazily constructed Managed.
 *
 * @tsplus static ets/ManagedOps suspend
 */
export function suspend<R, E, A>(
  managed: LazyArg<Managed<R, E, A>>,
  __etsTrace?: string
): Managed<R, E, A> {
  return Managed.unit.flatMap(managed)
}
