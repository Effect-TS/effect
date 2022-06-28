import { SemaphoreInternal } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * Creates a new `Semaphore` with the specified number of permits.
 *
 * @tsplus static effect/core/io/Semaphore.Ops make
 */
export function make(permits: number, __tsplusTrace?: string): Effect<never, never, Semaphore> {
  return TSemaphore.makeCommit(permits).map((semaphore) => new SemaphoreInternal(semaphore))
}
