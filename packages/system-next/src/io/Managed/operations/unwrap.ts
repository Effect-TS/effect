import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Unwraps a `Managed` that is inside an `Effect`.
 *
 * @ets static ets/ManagedOps unwrap
 */
export function unwrap<R, E, A>(
  effect: Effect<R, E, Managed<R, E, A>>,
  __etsTrace?: string
): Managed<R, E, A> {
  return Managed.fromEffect(effect).flatten()
}
