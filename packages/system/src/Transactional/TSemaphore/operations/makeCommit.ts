// ets_tracing: off

import type { UIO } from "../../../Effect"
import * as STM from "../../STM"
import type { TSemaphore } from "../definition"
import { make } from "./make"

/**
 * Constructs a new `TSemaphore` with the specified number of permits,
 * immediately committing the transaction.
 */
export function makeCommit(permits: number, __trace?: string): UIO<TSemaphore> {
  return STM.commit(make(permits))
}
