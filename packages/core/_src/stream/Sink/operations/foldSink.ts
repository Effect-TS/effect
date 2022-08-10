import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus static effect/core/stream/Sink.Aspects foldSink
 * @tsplus pipeable effect/core/stream/Sink foldSink
 */
export function foldSink_<
  R1,
  R2,
  E,
  E1,
  E2,
  In,
  In1 extends In,
  In2 extends In,
  L,
  L1 extends L,
  L2 extends L,
  Z,
  Z1,
  Z2
>(
  failure: (err: E) => Sink<R1, E1, In1, L1, Z1>,
  success: (z: Z) => Sink<R2, E2, In2, L2, Z2>
) {
  return <R>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R1 | R2, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2> => {
    concreteSink(self)
    return new SinkInternal(
      self.channel.doneCollect.foldChannel(
        (err) => {
          const result = failure(err)
          concreteSink(result)
          return result.channel
        },
        ({ tuple: [leftovers, z] }) =>
          Channel.suspend(() => {
            const leftoversRef = new AtomicReference(
              leftovers.filter((chunk): chunk is Chunk<L1 | L2> => chunk.isNonEmpty)
            )
            const refReader = Channel.sync(
              leftoversRef.getAndSet(Chunk.empty())
            ).flatMap((chunk) => Channel.writeChunk(chunk as unknown as Chunk<Chunk<In1 & In2>>))
            const passThrough = Channel.identity<never, Chunk<In1 & In2>, unknown>()
            const result = success(z)
            concreteSink(result)
            const continuationSink = refReader.zipRight(passThrough).pipeTo(result.channel)
            return continuationSink
              .doneCollect
              .flatMap(
                ({ tuple: [newLeftovers, z1] }) =>
                  Channel.sync(leftoversRef.get)
                    .flatMap((chunk) => Channel.writeChunk(chunk))
                    .zipRight(Channel.writeChunk(newLeftovers).as(z1))
              )
          })
      )
    )
  }
}
