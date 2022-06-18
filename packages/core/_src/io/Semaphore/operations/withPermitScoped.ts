import { concreteSemaphore } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * Returns a scoped effect that describes acquiring a permit as the `acquire`
 * action and releasing it as the `release` action.
 *
 * @tsplus getter ets/Semaphore withPermitScoped
 */
export function withPermitScoped(self: Semaphore, __tsplusTrace?: string): Effect<Scope, never, void> {
  concreteSemaphore(self)
  return self.semaphore.withPermitScoped()
}
