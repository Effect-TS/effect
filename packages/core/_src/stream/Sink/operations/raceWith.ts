import { MergeDecision } from "@effect/core/stream/Channel/MergeDecision"
import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Runs both sinks in parallel on the input, using the specified merge
 * function as soon as one result or the other has been computed.
 *
 * @tsplus static effect/core/stream/Sink.Aspects raceWith
 * @tsplus pipeable effect/core/stream/Sink raceWith
 */
export function raceWith<R1, E1, In1, L1, Z1, E, Z, Z2>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  leftDone: (exit: Exit<E, Z>) => MergeDecision<R1, E1, Z1, E | E1, Z2>,
  rightDone: (exit: Exit<E1, Z1>) => MergeDecision<R1, E, Z, E | E1, Z2>,
  capacity = 16
) {
  return <R, In, L>(self: Sink<R, E, In, L, Z>): Sink<R | R1, E | E1, In & In1, L | L1, Z2> =>
    Sink.unwrapScoped<R | R1, E | E1, In & In1, L | L1, Z2>(
      Do(($) => {
        const hub = $(Hub.bounded<Either<Exit<never, unknown>, Chunk<In & In1>>>(capacity))
        const c1 = $(Channel.fromHubScoped(hub))
        const c2 = $(Channel.fromHubScoped(hub))
        const reader = Channel.toHub(hub)
        const that0 = that()
        concreteSink(self)
        concreteSink(that0)
        const writer = (c1 >> self.channel).mergeWith(c2 >> that0.channel, leftDone, rightDone)
        const channel = reader.mergeWith(
          writer,
          () => MergeDecision.await((exit) => Effect.done(exit)),
          (done) => MergeDecision.done(Effect.done(done))
        )
        return new SinkInternal<R | R1, E | E1, In & In1, L | L1, Z2>(channel)
      })
    )
}
