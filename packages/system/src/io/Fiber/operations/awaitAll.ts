import type { UIO } from "../../Effect"
import type { Fiber } from "../definition"
import { collectAll } from "./collectAll"

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function awaitAll(
  fibers: Iterable<Fiber<any, any>>,
  __etsTrace?: string
): UIO<void> {
  return collectAll(fibers).await.asUnit()
}
