// ets_tracing: off

import type { UIO } from "../../../Effect/index.js"
import * as STM from "../../STM/index.js"
import type { TSemaphore } from "../definition.js"
import { make } from "./make.js"

/**
 * Constructs a new `TSemaphore` with the specified number of permits,
 * immediately committing the transaction.
 */
export function makeCommit(permits: number, __trace?: string): UIO<TSemaphore> {
  return STM.commit(make(permits))
}
