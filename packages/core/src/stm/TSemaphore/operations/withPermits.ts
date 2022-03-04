import { Effect } from "../../../io/Effect"
import type { TSemaphore } from "../definition"

/**
 * Executes the specified effect, acquiring the specified number of permits
 * immediately before the effect begins execution and releasing them
 * immediately after the effect completes execution, whether by success,
 * failure, or interruption.
 *
 * @tsplus fluent ets/TSemaphore withPermits
 */
export function withPermits(self: TSemaphore, permits: number, __tsplusTrace?: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.uninterruptibleMask(
      ({ restore }) =>
        restore(self.acquireN(permits).commit()) >
        restore(effect).ensuring(self.releaseN(permits).commit())
    )
}
