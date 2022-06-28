import { concreteSemaphore } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * Returns the number of available permits.
 *
 * @tsplus getter effect/core/io/Semaphore available
 */
export function available(self: Semaphore, __tsplusTrace?: string): Effect<never, never, number> {
  concreteSemaphore(self)
  return self.semaphore.available.commit
}
