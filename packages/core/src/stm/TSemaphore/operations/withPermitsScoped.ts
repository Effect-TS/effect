import { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import type { TSemaphore } from "../definition"

/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 *
 * @tsplus fluent ets/TSemaphore withPermitsScoped
 */
export function withPermitsScoped_(
  self: TSemaphore,
  permits: number,
  __tsplusTrace?: string
): Effect<HasScope, never, void> {
  return Effect.acquireReleaseInterruptible(
    self.acquireN(permits).commit(),
    self.releaseN(permits).commit()
  )
}

/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 */
export const withPermitsScoped = Pipeable(withPermitsScoped_)
