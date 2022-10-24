import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Takes all the values from the queue.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue takeAll
 * @category mutations
 * @since 1.0.0
 */
export function takeAll<A>(self: THub.TDequeue<A>): USTM<Chunk<A>> {
  return self.takeUpTo(Infinity)
}
