import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Applies the transducer to the stream and emits its outputs.
 *
 * @tsplus static effect/core/stream/Stream.Aspects fromSink
 * @tsplus pipeable effect/core/stream/Stream transduce
 */
export function transduce<R2, E2, A, Z>(sink: Sink<R2, E2, A, A, Z>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, Z> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.suspend(() => {
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
          (chunk: Chunk<A>) => Channel.write(chunk).flatMap(() => upstreamMarker),
          (err) => Channel.fail(err),
          (done) => Channel.sync(upstreamDone.set(true)).flatMap(() => Channel.succeed(done))
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
              (chunk: Chunk<A>) => Channel.write(chunk).flatMap(() => buffer),
              (err) => Channel.fail(err),
              (done) => Channel.succeed(done)
            )
          }

          leftovers.set(Chunk.empty())

          return Channel.writeChunk(leftover).flatMap(() => buffer)
        })
        concreteSink(sink)
        const transducer: Channel<
          R | R2,
          never,
          Chunk<A>,
          unknown,
          E | E2,
          Chunk<Z>,
          void
        > = sink.channel.doneCollect.flatMap(([leftover, z]) =>
          Channel.sync([upstreamDone.get, concatAndGet(leftovers, leftover)] as const).flatMap(
            ([done, newLeftovers]) => {
              const nextChannel = done && newLeftovers.isEmpty ? Channel.unit : transducer
              return Channel.write(Chunk.single(z)).flatMap(() => nextChannel)
            }
          )
        )

        return (self.channel >> upstreamMarker) >> buffer.pipeToOrFail(transducer)
      })
    )
  }
}

function concatAndGet<A>(
  leftovers: AtomicReference<Chunk<Chunk<A>>>,
  chunk: Chunk<Chunk<A>>
): Chunk<Chunk<A>> {
  const ls = leftovers.get
  const concat = ls + chunk.filter((c) => c.isNonEmpty)
  leftovers.set(concat)
  return concat
}
