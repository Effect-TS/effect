import { concreteSemaphore } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 *
 * @tsplus fluent ets/Semaphore withPermitsScoped
 */
export function withPermitsScoped_(
  self: Semaphore,
  permits: number,
  __tsplusTrace?: string
): Effect.RIO<Has<Scope>, void> {
  concreteSemaphore(self)
  return self.semaphore.withPermitsScoped(permits)
}

/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 *
 * @tsplus static ets/Semaphore/Aspects withPermitsScoped
 */
export const withPermitsScoped = Pipeable(withPermitsScoped_)
