// ets_tracing: off

import * as STM from "../../STM/index.js"
import * as TRef from "../../TRef/index.js"
import { TSemaphore } from "../definition.js"

/**
 * Constructs a new `TSemaphore` with the specified number of permits.
 */
export function make(
  permits: number,
  __trace?: string
): STM.STM<unknown, never, TSemaphore> {
  return STM.map_(TRef.make(permits), (v) => new TSemaphore(v))
}
