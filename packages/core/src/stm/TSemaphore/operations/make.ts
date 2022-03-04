import type { STM } from "../../STM"
import { TRef } from "../../TRef"
import { TSemaphore } from "../definition"

/**
 * Constructs a new `TSemaphore` with the specified number of permits.
 *
 * @tsplus static ets/TSemaphoreOps make
 */
export function make(permits: number): STM<unknown, never, TSemaphore> {
  return TRef.make(permits).map((v) => new TSemaphore(v))
}
