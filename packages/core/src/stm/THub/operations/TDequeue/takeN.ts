import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it retries until they
 * become available.
 *
 * @tsplus static effect/core/stm/THub/TDequeue.Aspects takeN
 * @tsplus pipeable effect/core/stm/THub/TDequeue takeN
 * @category mutations
 * @since 1.0.0
 */
export function takeN(n: number) {
  return <A>(self: THub.TDequeue<A>): STM<never, never, Chunk<A>> => self.takeBetween(n, n)
}
