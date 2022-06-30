import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Applies the transducer to the stream and emits its outputs.
 *
 * @tsplus static effect/core/stream/Stream.Aspects fromSink
 * @tsplus pipeable effect/core/stream/Stream transduce
 */
export function transduce<R2, E2, A, Z>(
  sink: LazyArg<Sink<R2, E2, A, A, Z>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, Z> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.suspend(() => {
        const sink0 = sink()
        concreteSink(sink0)
        const leftovers = new AtomicReference(Chunk.empty<Chunk<A>>())
        const upstreamDone = new AtomicBoolean(false)

        const upstreamMarker: Channel<
          never,
          E,
          Chunk<A>,
          unknown,
          E,
          Chunk<A>,
          unknown
        > = Channel.readWith(
          (chunk: Chunk<A>) => Channel.write(chunk) > upstreamMarker,
          (err) => Channel.fail(err),
          (done) => Channel.succeed(upstreamDone.set(true)) > Channel.succeedNow(done)
        )

        const buffer: Channel<
          never,
          E,
          Chunk<A>,
          unknown,
          E | E2,
          Chunk<A>,
          unknown
        > = Channel.suspend(() => {
          const leftover = leftovers.get

          if (leftover.isEmpty) {
            return Channel.readWith(
              (chunk: Chunk<A>) => Channel.write(chunk) > buffer,
              (err) => Channel.fail(err),
              (done) => Channel.succeedNow(done)
            )
          }

          leftovers.set(Chunk.empty())

          return Channel.writeChunk(leftover) > buffer
        })

        const transducer: Channel<
          R | R2,
          never,
          Chunk<A>,
          unknown,
          E | E2,
          Chunk<Z>,
          void
        > = sink0.channel.doneCollect.flatMap(({ tuple: [leftover, z] }) =>
          Channel.succeed(
            Tuple(upstreamDone.get, concatAndGet(leftovers, leftover))
          ).flatMap(({ tuple: [done, newLeftovers] }) => {
            const nextChannel = done && newLeftovers.isEmpty ? Channel.unit : transducer
            return Channel.write(Chunk.single(z)) > nextChannel
          })
        )

        return (self.channel >> upstreamMarker) >> buffer.pipeToOrFail(transducer)
      })
    )
  }
}

function concatAndGet<A>(
  leftovers: AtomicReference<Chunk<Chunk<A>>>,
  chunk: Chunk<Chunk<A>>,
  __tsplusTrace?: string
): Chunk<Chunk<A>> {
  const ls = leftovers.get
  const concat = ls + chunk.filter((c) => c.isNonEmpty)
  leftovers.set(concat)
  return concat
}
