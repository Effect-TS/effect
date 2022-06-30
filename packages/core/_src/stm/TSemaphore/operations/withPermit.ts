/**
 * Executes the specified effect, acquiring a permit immediately before the
 * effect begins execution and releasing it immediately after the effect
 * completes execution, whether by success, failure, or interruption.
 *
 * @tsplus getter effect/core/stm/TSemaphore withPermit
 */
export function withPermit(self: TSemaphore, __tsplusTrace?: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> => self.withPermits(1)(effect)
}
