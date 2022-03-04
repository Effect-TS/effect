import type { STM } from "../../STM"
import type { TSemaphore } from "../definition"

/**
 * Returns the number of available permits in a transactional context.
 *
 * @tsplus fluent ets/TSemaphore available
 */
export function available(self: TSemaphore): STM<unknown, never, number> {
  return self.permits.get()
}
