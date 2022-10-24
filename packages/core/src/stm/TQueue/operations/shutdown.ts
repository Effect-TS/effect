import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Shuts down the queue.
 *
 * @tsplus getter effect/core/stm/TQueue shutdown
 * @category destructors
 * @since 1.0.0
 */
export function shutdown<A>(self: TQueue<A>): USTM<void> {
  concreteTQueue(self)
  return STM.Effect((journal) => self.ref.unsafeSet(undefined, journal))
}
