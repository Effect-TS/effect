// ets_tracing: off

import type { Fiber } from "../definition"
import * as T from "./_internal/effect-api"
import { collectAll } from "./collectAll"
import { join } from "./join"

/**
 * Joins all fibers, awaiting their _successful_ completion. Attempting to
 * join a fiber that has erred will result in a catchable error, _if_ that
 * error does not result from interruption.
 */
export function joinAll<E>(
  fs: Iterable<Fiber<E, any>>,
  __trace?: string
): T.IO<E, void> {
  return T.asUnit(join(collectAll(fs)), __trace)
}
