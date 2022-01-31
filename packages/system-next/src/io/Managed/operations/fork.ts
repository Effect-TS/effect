import { managedFork } from "../../Effect/operations/excl-forEach"
import type { Fiber } from "../../Fiber"
import type { Managed } from "../definition"

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 *
 * @ets fluent ets/Managed fork
 */
export function fork<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, never, Fiber<E, A>> {
  return managedFork(self)
}
