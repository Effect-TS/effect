import type { FiberContext } from "../Fiber"
import { fork } from "../Managed/core"
import type { Managed } from "../Managed/managed"
import type { Effect } from "./effect"
import { toManaged } from "./toManaged"

/**
 * Forks the fiber in a `Managed`. Using the `Managed` value will
 * execute the effect in the fiber, while ensuring its interruption when
 * the effect supplied to `use` completes.
 */
export function forkManaged<R, E, A>(
  self: Effect<R, E, A>
): Managed<R, never, FiberContext<E, A>> {
  return fork(toManaged()(self))
}
