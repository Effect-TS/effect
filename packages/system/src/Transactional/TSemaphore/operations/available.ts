// ets_tracing: off

import type { STM } from "../../STM/index.js"
import * as TRef from "../../TRef/index.js"
import type { TSemaphore } from "../definition.js"

/**
 * Returns the number of available permits in a transactional context.
 */
export function available(self: TSemaphore): STM<unknown, never, number> {
  return TRef.get(self.permits)
}
