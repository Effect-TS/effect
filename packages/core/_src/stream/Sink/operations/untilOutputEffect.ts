import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink that produces values until one verifies the predicate `f`.
 *
 * @tsplus static effect/core/stream/Sink.Aspects untilOutputEffect
 * @tsplus pipeable effect/core/stream/Sink untilOutputEffect
 */
export function untilOutputEffect<R2, E2, Z>(
  f: (z: Z) => Effect<R2, E2, boolean>
) {
  return <R, E, In, L extends In>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R2, E | E2, In, L, Maybe<Z>> => {
    concreteSink(self)
    return new SinkInternal(
      Channel.fromEffect(Ref.make(Chunk.empty<In>()).zip(Ref.make(false))).flatMap(
        ({ tuple: [leftoversRef, upstreamDoneRef] }) => {
          const upstreamMarker: Channel<
            never,
            never,
            Chunk<In>,
            unknown,
            never,
            Chunk<In>,
            unknown
          > = Channel.readWith(
            (chunk: Chunk<In>) => Channel.write(chunk) > upstreamMarker,
            (err) => Channel.failSync(() => err),
            (done) => Channel.fromEffect(upstreamDoneRef.set(true)).as(done)
          )

          const loop: Channel<
            R | R2,
            never,
            Chunk<In>,
            unknown,
            E | E2,
            Chunk<L>,
            Maybe<Z>
          > = self.channel.doneCollect.foldChannel(
            (err) => Channel.failSync(err),
            ({ tuple: [leftovers, doneValue] }) =>
              Channel.fromEffect(f(doneValue)).flatMap(
                (satisfied) =>
                  Channel.fromEffect(leftoversRef.set(leftovers.flatten)) >
                    Channel.fromEffect(upstreamDoneRef.get).flatMap((upstreamDone) =>
                      satisfied
                        ? Channel.write(leftovers.flatten).as(Maybe.some(doneValue))
                        : upstreamDone
                        ? Channel.write(leftovers.flatten).as(Maybe.none)
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
}
