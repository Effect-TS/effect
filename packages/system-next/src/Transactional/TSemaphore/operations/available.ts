import type { STM } from "../../STM"
import * as TRef from "../../TRef"
import type { TSemaphore } from "../definition"

/**
 * Returns the number of available permits in a transactional context.
 */
export function available(self: TSemaphore): STM<unknown, never, number> {
  return TRef.get(self.permits)
}
