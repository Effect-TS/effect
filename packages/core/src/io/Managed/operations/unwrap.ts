import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Unwraps a `Managed` that is inside an `Effect`.
 *
 * @tsplus static ets/ManagedOps unwrap
 */
export function unwrap<R, E, A>(
  effect: LazyArg<Effect<R, E, Managed<R, E, A>>>,
  __tsplusTrace?: string
): Managed<R, E, A> {
  return Managed.fromEffect(effect).flatten()
}
