import type * as Fiber from "../../Fiber"
import type { Managed } from "../../Managed"
import type { Effect } from "../definition"

/**
 * Forks the fiber in a `Managed`. Using the `Managed` value will execute the
 * effect in the fiber, while ensuring its interruption when the effect
 * supplied to `Managed.use` completes.
 *
 * @tsplus fluent ets/Effect forkManaged
 */
export function forkManaged<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Managed<R, never, Fiber.Runtime<E, A>> {
  return self.toManaged().fork()
}
