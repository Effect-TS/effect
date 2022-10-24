import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/**
 * Applies the transducer to the stream and emits its outputs.
 *
 * @tsplus static effect/core/stream/Stream.Aspects fromSink
 * @tsplus pipeable effect/core/stream/Stream transduce
 * @category mutations
 * @since 1.0.0
 */
export function transduce<R2, E2, A, Z>(sink: Sink<R2, E2, A, A, Z>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, Z> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.suspend(() => {
        const leftovers = MutableRef.make<Chunk.Chunk<Chunk.Chunk<A>>>(Chunk.empty)
        const upstreamDone = MutableRef.make(false)

        const upstreamMarker: Channel<
          never,
          E,
          Chunk.Chunk<A>,
          unknown,
          E,
          Chunk.Chunk<A>,
          unknown
        > = Channel.readWith(
          (chunk: Chunk.Chunk<A>) => Channel.write(chunk).flatMap(() => upstreamMarker),
          (err) => Channel.fail(err),
          (done) =>
            Channel
              .sync(pipe(upstreamDone, MutableRef.set(true)))
              .flatMap(() => Channel.succeed(done))
        )

        const buffer: Channel<
          never,
          E,
          Chunk.Chunk<A>,
          unknown,
          E | E2,
          Chunk.Chunk<A>,
          unknown
        > = Channel.suspend(() => {
          const leftover = MutableRef.get(leftovers)

          if (Chunk.isEmpty(leftover)) {
            return Channel.readWith(
              (chunk: Chunk.Chunk<A>) => Channel.write(chunk).flatMap(() => buffer),
              (err) => Channel.fail(err),
              (done) => Channel.succeed(done)
            )
          }

          pipe(leftovers, MutableRef.set<Chunk.Chunk<Chunk.Chunk<A>>>(Chunk.empty))

          return Channel.writeChunk(leftover).flatMap(() => buffer)
        })
        concreteSink(sink)
        const transducer: Channel<
          R | R2,
          never,
          Chunk.Chunk<A>,
          unknown,
          E | E2,
          Chunk.Chunk<Z>,
          void
        > = sink.channel.doneCollect.flatMap(([leftover, z]) =>
          Channel.sync([MutableRef.get(upstreamDone), concatAndGet(leftovers, leftover)] as const)
            .flatMap(
              ([done, newLeftovers]) => {
                const nextChannel = done && Chunk.isEmpty(newLeftovers) ? Channel.unit : transducer
                return Channel.write(Chunk.single(z)).flatMap(() => nextChannel)
              }
            )
        )

        return self.channel.pipeTo(upstreamMarker).pipeTo(buffer.pipeToOrFail(transducer))
      })
    )
  }
}

function concatAndGet<A>(
  leftovers: MutableRef.MutableRef<Chunk.Chunk<Chunk.Chunk<A>>>,
  chunk: Chunk.Chunk<Chunk.Chunk<A>>
): Chunk.Chunk<Chunk.Chunk<A>> {
  const ls = MutableRef.get(leftovers)
  const concat = pipe(ls, Chunk.concat(pipe(chunk, Chunk.filter(Chunk.isNonEmpty))))
  pipe(leftovers, MutableRef.set(concat))
  return concat
}
