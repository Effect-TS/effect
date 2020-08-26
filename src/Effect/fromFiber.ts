import * as Fiber from "../Fiber"
import { chain_, effectTotal } from "./core"
import type { AsyncE } from "./effect"

/**
 * Creates a `Effect` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiber<E, A>(fiber: () => Fiber.Fiber<E, A>): AsyncE<E, A> {
  return chain_(effectTotal(fiber), Fiber.join)
}
