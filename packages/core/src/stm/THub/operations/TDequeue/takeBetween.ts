import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Takes a number of elements from the queue between the specified minimum and
 * maximum. If there are fewer than the minimum number of elements available,
 * retries until at least the minimum number of elements have been collected.
 *
 * @tsplus static effect/core/stm/THub/TDequeue.Aspects takeBetween
 * @tsplus pipeable effect/core/stm/THub/TDequeue takeBetween
 * @category mutations
 * @since 1.0.0
 */
export function takeBetween(min: number, max: number) {
  return <A>(self: THub.TDequeue<A>): STM<never, never, Chunk.Chunk<A>> =>
    STM.suspend(self.takeRemainder(min, max, Chunk.empty))
}
