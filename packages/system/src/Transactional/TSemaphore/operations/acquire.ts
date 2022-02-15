// ets_tracing: off

import type { STM } from "../../STM/index.js"
import type { TSemaphore } from "../definition.js"
import { acquireN_ } from "./acquireN.js"

/**
 * Acquires a single permit in transactional context.
 */
export function acquire(self: TSemaphore): STM<unknown, never, void> {
  return acquireN_(self, 1)
}
