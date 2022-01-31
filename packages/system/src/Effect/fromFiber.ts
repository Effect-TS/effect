// ets_tracing: off

import * as Fiber from "../Fiber/index.js"
import { chain_, succeedWith } from "./core.js"
import type { Effect, IO } from "./effect.js"

/**
 * Creates a `Effect` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiber<E, A>(
  fiber: () => Fiber.Fiber<E, A>,
  __trace?: string
): IO<E, A> {
  return chain_(succeedWith(fiber), Fiber.join, __trace)
}

/**
 * Creates a `Effect` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiberM<R, E, E2, A>(
  fiber: Effect<R, E, Fiber.Fiber<E2, A>>,
  __trace?: string
): Effect<R, E | E2, A> {
  return chain_(fiber, Fiber.join, __trace)
}
