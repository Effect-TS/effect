import * as Chunk from "@fp-ts/data/Chunk"
import { identity } from "@fp-ts/data/Function"

/**
 * Publishes all of the specified messages to the hub, returning whether they
 * were published to the hub.
 *
 * @tsplus static effect/core/stm/THub.Aspects publishAll
 * @tsplus pipeable effect/core/stm/THub publishAll
 * @category mutations
 * @since 1.0.0
 */
export function publishAll<A>(as: Iterable<A>) {
  return (self: THub<A>): STM<never, never, boolean> =>
    STM.forEach(as, (a) => self.publish(a)).map(Chunk.every(identity))
}
