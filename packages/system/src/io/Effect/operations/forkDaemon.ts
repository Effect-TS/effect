import { Option } from "../../../data/Option"
import type * as Fiber from "../../Fiber"
import { globalScope } from "../../Scope"
import type { Effect, RIO } from "../definition"
import { IFork } from "../definition"

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 *
 * @tsplus fluent ets/Effect forkDaemon
 */
export function forkDaemon<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): RIO<R, Fiber.Runtime<E, A>> {
  return new IFork(self, () => Option.some(globalScope), __etsTrace)
}
