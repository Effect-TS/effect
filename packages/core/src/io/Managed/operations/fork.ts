import { managedFork } from "../../Effect/operations/excl-forEach"
import type * as Fiber from "../../Fiber"
import type { Managed } from "../definition"

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 *
 * @tsplus fluent ets/Managed fork
 */
export function fork<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, never, Fiber.Runtime<E, A>> {
  return managedFork(self)
}
