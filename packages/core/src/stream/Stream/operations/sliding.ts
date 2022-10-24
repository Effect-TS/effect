import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { RingBufferNew } from "@effect/core/support/RingBufferNew"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Emits a sliding window of `n` elements.
 *
 * @tsplus static effect/core/stream/Stream.Aspects sliding
 * @tsplus pipeable effect/core/stream/Stream sliding
 * @category mutations
 * @since 1.0.0
 */
export function sliding(chunkSize: number, stepSize = 1) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, Chunk.Chunk<A>> => {
    if (chunkSize <= 0 || stepSize <= 0) {
      return Stream.dieSync(
        new IllegalArgumentException(
          "Invalid bounds - `chunkSize` and `stepSize` must be greater than 0"
        )
      )
    }
    return Stream.sync(new RingBufferNew<A>(chunkSize)).flatMap((queue) => {
      concreteStream(self)
      return new StreamInternal(
        self.channel.pipeTo(reader<E, A>(chunkSize, stepSize, queue, 0))
      )
    })
  }
}

function reader<E, A>(
  chunkSize: number,
  stepSize: number,
  queue: RingBufferNew<A>,
  queueSize: number
): Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown> {
  return Channel.readWithCause(
    (input: Chunk.Chunk<A>) =>
      Channel.write(
        pipe(
          Chunk.zipWithIndex(input),
          Chunk.filterMap(([a, index]) => {
            queue.put(a)
            const currentIndex = queueSize + index + 1
            return currentIndex < chunkSize || (currentIndex - chunkSize) % stepSize > 0
              ? Option.none
              : Option.some(queue.toChunk())
          })
        )
      ).flatMap(() => reader<E, A>(chunkSize, stepSize, queue, queueSize + input.length)),
    (cause) =>
      emitOnStreamEnd<E, A>(
        chunkSize,
        stepSize,
        queue,
        queueSize,
        Channel.failCause(cause)
      ),
    () => emitOnStreamEnd<E, A>(chunkSize, stepSize, queue, queueSize, Channel.unit)
  )
}

function emitOnStreamEnd<E, A>(
  chunkSize: number,
  stepSize: number,
  queue: RingBufferNew<A>,
  queueSize: number,
  channelEnd: Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown>
): Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown> {
  if (queueSize < chunkSize) {
    const items = queue.toChunk()
    const result = Chunk.isEmpty(items) ? Chunk.empty : Chunk.single(items)
    return Channel.write(result).flatMap(() => channelEnd)
  }

  const lastEmitIndex = queueSize - ((queueSize - chunkSize) % stepSize)

  if (lastEmitIndex === queueSize) {
    return channelEnd
  }

  const leftovers = queueSize - (lastEmitIndex - chunkSize + stepSize)
  const lastItems = pipe(queue.toChunk(), Chunk.takeRight(leftovers))
  const result = Chunk.isEmpty(lastItems) ? Chunk.empty : Chunk.single(lastItems)

  return Channel.write(result).flatMap(() => channelEnd)
}
