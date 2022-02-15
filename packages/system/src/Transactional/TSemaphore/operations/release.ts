// ets_tracing: off

import type { STM } from "../../STM/index.js"
import type { TSemaphore } from "../definition.js"
import { releaseN_ } from "./releaseN.js"

/**
 * Releases a single permit in a transactional context.
 */
export function release(self: TSemaphore): STM<unknown, never, void> {
  return releaseN_(self, 1)
}
