import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a sink that produces values until one verifies the predicate `f`.
 *
 * @tsplus static effect/core/stream/Sink.Aspects untilOutputEffect
 * @tsplus pipeable effect/core/stream/Sink untilOutputEffect
 * @category mutations
 * @since 1.0.0
 */
export function untilOutputEffect<R2, E2, Z>(
  f: (z: Z) => Effect<R2, E2, boolean>
) {
  return <R, E, In, L extends In>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R2, E | E2, In, L, Option.Option<Z>> => {
    concreteSink(self)
    return new SinkInternal(
      Channel.fromEffect(Ref.make(Chunk.empty as Chunk.Chunk<In>).zip(Ref.make(false))).flatMap(
        ([leftoversRef, upstreamDoneRef]) => {
          const upstreamMarker: Channel<
            never,
            never,
            Chunk.Chunk<In>,
            unknown,
            never,
            Chunk.Chunk<In>,
            unknown
          > = Channel.readWith(
            (chunk: Chunk.Chunk<In>) => Channel.write(chunk).flatMap(() => upstreamMarker),
            (err) => Channel.fail(err),
            (done) => Channel.fromEffect(upstreamDoneRef.set(true)).as(done)
          )

          const loop: Channel<
            R | R2,
            never,
            Chunk.Chunk<In>,
            unknown,
            E | E2,
            Chunk.Chunk<L>,
            Option.Option<Z>
          > = self.channel.doneCollect.foldChannel(
            (err) => Channel.fail(err),
            ([leftovers, doneValue]) =>
              Channel.fromEffect(f(doneValue)).flatMap(
                (satisfied) =>
                  Channel.fromEffect(leftoversRef.set(Chunk.flatten(leftovers))).flatMap(() =>
                    Channel.fromEffect(upstreamDoneRef.get).flatMap((upstreamDone) =>
                      satisfied
                        ? Channel.write(Chunk.flatten(leftovers)).as(Option.some(doneValue))
                        : upstreamDone
                        ? Channel.write(Chunk.flatten(leftovers)).as(Option.none)
                        : loop
                    )
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
}
