import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import { Hub } from "../../../io/Hub"
import { Channel } from "../../Channel"
import { MergeDecision } from "../../Channel/MergeDecision"
import { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * Runs both sinks in parallel on the input, using the specified merge
 * function as soon as one result or the other has been computed.
 *
 * @tsplus fluent ets/Sink raceWith
 */
export function raceWith_<R, R1, E, E1, In, In1, L, L1, Z, Z1, Z2>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  leftDone: (exit: Exit<E, Z>) => MergeDecision<R1, E1, Z1, E | E1, Z2>,
  rightDone: (exit: Exit<E1, Z1>) => MergeDecision<R1, E, Z, E | E1, Z2>,
  capacity = 16,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In & In1, L | L1, Z2> {
  return Sink.unwrapScoped<R & R1, E | E1, In & In1, L | L1, Z2>(
    Effect.Do()
      .bind("hub", () =>
        Hub.bounded<Either<Exit<never, unknown>, Chunk<In & In1>>>(capacity)
      )
      .bind("c1", ({ hub }) => Channel.fromHubManaged(hub))
      .bind("c2", ({ hub }) => Channel.fromHubManaged(hub))
      .bindValue("reader", ({ hub }) => Channel.toHub(hub))
      .bindValue("writer", ({ c1, c2 }) => {
        const that0 = that()
        concreteSink(self)
        concreteSink(that0)
        return (c1 >> self.channel).mergeWith(c2 >> that0.channel, leftDone, rightDone)
      })
      .bindValue("channel", ({ reader, writer }) =>
        reader.mergeWith(
          writer,
          () => MergeDecision.await((exit) => Effect.done(exit)),
          (done) => MergeDecision.done(Effect.done(done))
        )
      )
      .map(({ channel }) => new SinkInternal(channel))
  )
}

/**
 * Runs both sinks in parallel on the input, using the specified merge
 * function as soon as one result or the other has been computed.
 */
export const raceWith = Pipeable(raceWith_)
