import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Effectfully accesses the environment of the effect.
 *
 * @tsplus static ets/ManagedOps environmentWithEffect
 */
export function environmentWithEffect<R0, R, E, A>(
  f: (_: R0) => Effect<R, E, A>,
  __etsTrace?: string
): Managed<R & R0, E, A> {
  return Managed.environment<R0>().mapEffect(f)
}
