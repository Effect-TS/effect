import type { STM } from "../../STM"
import type { TSemaphore } from "../definition"

/**
 * Acquires a single permit in transactional context.
 *
 * @tsplus fluent ets/TSemaphore acquire
 */
export function acquire(self: TSemaphore): STM<unknown, never, void> {
  return self.acquireN(1)
}
