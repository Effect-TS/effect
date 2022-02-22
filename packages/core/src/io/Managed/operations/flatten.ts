import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 *
 * @tsplus fluent ets/Managed flatten
 */
export function flattenNow<R, E, R1, E1, A>(
  self: Managed<R, E, Managed<R1, E1, A>>,
  __etsTrace?: string
): Managed<R & R1, E | E1, A> {
  return Managed.flatten(self)
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 *
 * @tsplus static ets/ManagedOps flatten
 */
export function flatten<R2, E2, R, E, A>(
  self: LazyArg<Managed<R2, E2, Managed<R, E, A>>>,
  __etsTrace?: string
) {
  return Managed.suspend(self).flatMap(identity)
}
