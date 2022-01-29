import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Creates an effect that only executes the provided finalizer as its
 * release action.
 *
 * @ets static ets/ManagedOps finalizer
 */
export function finalizer<R, X>(
  f: LazyArg<Effect<R, never, X>>,
  __etsTrace?: string
): Managed<R, never, void> {
  return Managed.finalizerExit(() => f())
}
