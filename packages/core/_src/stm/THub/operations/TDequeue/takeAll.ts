/**
 * Takes all the values from the queue.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue takeAll
 */
export function takeAll<A>(self: THub.TDequeue<A>): USTM<Chunk<A>> {
  return self.takeUpTo(Number.MAX_SAFE_INTEGER)
}
