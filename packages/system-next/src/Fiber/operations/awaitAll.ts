import type { Fiber } from "../definition"
import * as T from "./_internal/effect"
import { collectAll } from "./collectAll"

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function awaitAll(
  fibers: Iterable<Fiber<any, any>>,
  __trace?: string
): T.UIO<void> {
  return T.asUnit(collectAll(fibers).await)
}
