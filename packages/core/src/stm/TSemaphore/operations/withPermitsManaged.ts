import { Managed } from "../../../io/Managed"
import type { TSemaphore } from "../definition"

/**
 * Returns a managed effect that describes acquiring the specified number of
 * permits as the `acquire` action and releasing them as the `release` action.
 *
 * @tsplus fluent ets/TSemaphore withPermitsManaged
 */
export function withPermitsManaged_(
  self: TSemaphore,
  permits: number,
  __tsplusTrace?: string
): Managed<unknown, never, void> {
  return Managed.acquireReleaseInterruptible(
    self.acquireN(permits).commit(),
    self.releaseN(permits).commit()
  )
}

/**
 * Returns a managed effect that describes acquiring the specified number of
 * permits as the `acquire` action and releasing them as the `release` action.
 *
 * @ets_data_first withPermitsManaged_
 */
export function withPermitsManaged(permits: number, __tsplusTrace?: string) {
  return (self: TSemaphore): Managed<unknown, never, void> =>
    self.withPermitsManaged(permits)
}
