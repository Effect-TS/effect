import { concreteSemaphore } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * Executes the specified effect, acquiring a permit immediately before the
 * effect begins execution and releasing it immediately after the effect
 * completes execution, whether by success, failure, or interruption.
 *
 * @tsplus getter effect/core/io/Semaphore withPermit
 */
export function withPermit(self: Semaphore, __tsplusTrace?: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> => {
    concreteSemaphore(self)
    return self.semaphore.withPermit(effect)
  }
}
