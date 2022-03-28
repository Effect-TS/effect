import { Chunk } from "../../../collection/immutable/Chunk"
import { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Ref } from "../../../io/Ref"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * Creates a sink that produces values until one verifies the predicate `f`.
 *
 * @tsplus fluent ets/Sink untilOutputEffect
 */
export function untilOutputEffect_<R, E, R2, E2, In, L extends In, Z>(
  self: Sink<R, E, In, L, Z>,
  f: (z: Z) => Effect<R2, E2, boolean>,
  __tsplusTrace?: string
): Sink<R & R2, E | E2, In, L, Option<Z>> {
  concreteSink(self)
  return new SinkInternal(
    Channel.fromEffect(Ref.make(Chunk.empty<In>()).zip(Ref.make(false))).flatMap(
      ({ tuple: [leftoversRef, upstreamDoneRef] }) => {
        const upstreamMarker: Channel<
          unknown,
          never,
          Chunk<In>,
          unknown,
          never,
          Chunk<In>,
          unknown
        > = Channel.readWith(
          (chunk: Chunk<In>) => Channel.write(chunk) > upstreamMarker,
          (err) => Channel.fail(err),
          (done) => Channel.fromEffect(upstreamDoneRef.set(true)).as(done)
        )

        const loop: Channel<
          R & R2,
          never,
          Chunk<In>,
          unknown,
          E | E2,
          Chunk<L>,
          Option<Z>
        > = self.channel.doneCollect().foldChannel(
          (err) => Channel.fail(err),
          ({ tuple: [leftovers, doneValue] }) =>
            Channel.fromEffect(f(doneValue)).flatMap(
              (satisfied) =>
                Channel.fromEffect(leftoversRef.set(leftovers.flatten())) >
                Channel.fromEffect(upstreamDoneRef.get()).flatMap((upstreamDone) =>
                  satisfied
                    ? Channel.write(leftovers.flatten()).as(Option.some(doneValue))
                    : upstreamDone
                    ? Channel.write(leftovers.flatten()).as(Option.none)
                    : loop
                )
            )
        )

        return (
          (upstreamMarker >> Channel.bufferChunk<In, never, unknown>(leftoversRef)) >>
          loop
        )
      }
    )
  )
}

/**
 * Creates a sink that produces values until one verifies the predicate `f`.
 */
export const untilOutputEffect = Pipeable(untilOutputEffect_)
