import type { STM } from "../../STM"
import * as TRef from "../../TRef"
import { TSemaphore } from "../definition"

/**
 * Constructs a new `TSemaphore` with the specified number of permits.
 *
 * @tsplus static ets/TSemaphoreOps make
 */
export function make(
  permits: number,
  __trace?: string
): STM<unknown, never, TSemaphore> {
  return TRef.make(permits).map((v) => new TSemaphore(v))
}
