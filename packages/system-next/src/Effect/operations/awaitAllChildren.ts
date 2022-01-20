// ets_tracing: off

import { awaitAll } from "../../Fiber/operations/awaitAll"
import type { Effect } from "../definition"
import { ensuringChildren_ } from "./ensuringChildren"

/**
 * Returns a new effect that will not succeed with its value before first
 * waiting for the end of all child fibers forked by the effect.
 */
export function awaitAllChildren<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return ensuringChildren_(self, awaitAll, __trace)
}
