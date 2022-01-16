// ets_tracing: off

import * as STM from "../../STM"
import * as TRef from "../../TRef"
import { TSemaphore } from "../definition"

/**
 * Constructs a new `TSemaphore` with the specified number of permits.
 */
export function make(
  permits: number,
  __trace?: string
): STM.STM<unknown, never, TSemaphore> {
  return STM.map_(TRef.make(permits), (v) => new TSemaphore(v))
}
