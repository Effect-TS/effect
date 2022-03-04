import type { UIO } from "../../../io/Effect/definition"
import { TSemaphore } from "../definition"

/**
 * Constructs a new `TSemaphore` with the specified number of permits,
 * immediately committing the transaction.
 *
 * @tsplus static ets/TSemaphoreOps makeCommit
 */
export function makeCommit(permits: number, __tsplusTrace?: string): UIO<TSemaphore> {
  return TSemaphore.make(permits).commit()
}
