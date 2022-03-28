import { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { AtomicBoolean } from "../../../support/AtomicBoolean"
import { AtomicReference } from "../../../support/AtomicReference"
import { Channel } from "../../Channel"
import type { Sink } from "../../Sink"
import { concreteSink } from "../../Sink/operations/_internal/SinkInternal"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Applies the transducer to the stream and emits its outputs.
 *
 * @tsplus fluent ets/Stream transduce
 */
export function transduce_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A, A, Z>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, Z> {
  concreteStream(self)
  return new StreamInternal(
    Channel.suspend(() => {
      const sink0 = sink()
      concreteSink(sink0)
      const leftovers = new AtomicReference(Chunk.empty<Chunk<A>>())
      const upstreamDone = new AtomicBoolean(false)

      const upstreamMarker: Channel<
        unknown,
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
        unknown,
        E,
        Chunk<A>,
        unknown,
        E | E2,
        Chunk<A>,
        unknown
      > = Channel.suspend(() => {
        const leftover = leftovers.get

        if (leftover.isEmpty()) {
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
        R & R2,
        never,
        Chunk<A>,
        unknown,
        E | E2,
        Chunk<Z>,
        void
      > = sink0.channel.doneCollect().flatMap(({ tuple: [leftover, z] }) =>
        Channel.succeed(
          Tuple(upstreamDone.get, concatAndGet(leftovers, leftover))
        ).flatMap(({ tuple: [done, newLeftovers] }) => {
          const nextChannel = done && newLeftovers.isEmpty() ? Channel.unit : transducer
          return Channel.write(Chunk.single(z)) > nextChannel
        })
      )

      return (self.channel >> upstreamMarker) >> buffer.pipeToOrFail(transducer)
    })
  )
}

/**
 * Creates a pipeline that repeatedly sends all elements through the given
 * sink.
 *
 * @tsplus static ets/StreamOps fromSink
 */
export const transduce = Pipeable(transduce_)

function concatAndGet<A>(
  leftovers: AtomicReference<Chunk<Chunk<A>>>,
  chunk: Chunk<Chunk<A>>,
  __tsplusTrace?: string
): Chunk<Chunk<A>> {
  const ls = leftovers.get
  const concat = ls + chunk.filter((c) => c.isNonEmpty())
  leftovers.set(concat)
  return concat
}
