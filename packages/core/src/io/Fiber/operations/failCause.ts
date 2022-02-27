import type { Cause } from "../../Cause"
import { Exit } from "../../Exit"
import { Fiber } from "../definition"

/**
 * Creates a `Fiber` that has already failed with the specified cause.
 *
 * @tsplus static ets/FiberOps failCause
 */
export function failCause<E>(cause: Cause<E>): Fiber<E, never> {
  return Fiber.done(Exit.failCause(cause))
}
