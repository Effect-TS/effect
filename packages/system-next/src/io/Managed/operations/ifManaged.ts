import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @ets static ets/ManagedOps ifManaged
 */
export function ifManaged<R, E, R1, E1, A1, R2, E2, A2>(
  b: LazyArg<Managed<R, E, boolean>>,
  onTrue: LazyArg<Managed<R1, E1, A1>>,
  onFalse: LazyArg<Managed<R2, E2, A2>>,
  __etsTrace?: string
): Managed<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return Managed.suspend(b().flatMap((result) => (result ? onTrue() : onFalse())))
}
