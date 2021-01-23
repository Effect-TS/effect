import * as Fiber from "../Fiber"
import { pipe } from "../Function"
import type { Effect } from "./effect"
import { ensuringChildren } from "./ensuringChildren"

/**
 * Returns a new effect that will not succeed with its value before first
 * waiting for the end of all child fibers forked by the effect.
 */
export function awaitAllChildren<R, E, A>(fa: Effect<R, E, A>): Effect<R, E, A> {
  return pipe(fa, ensuringChildren(Fiber.waitAll))
}
