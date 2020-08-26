import * as Fiber from "../Fiber"
import { chain_, effectTotal } from "./core"
import type { AsyncE, AsyncRE, Effect } from "./effect"

/**
 * Creates a `Effect` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiber<E, A>(fiber: () => Fiber.Fiber<E, A>): AsyncE<E, A> {
  return chain_(effectTotal(fiber), Fiber.join)
}

/**
 * Creates a `Effect` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiberM<S, R, E, E2, A>(
  fiber: Effect<S, R, E, Fiber.Fiber<E2, A>>
): AsyncRE<R, E | E2, A> {
  return chain_(fiber, Fiber.join)
}
