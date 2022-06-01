import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { RingBufferNew } from "@effect/core/support/RingBufferNew"

/**
 * Emits a sliding window of `n` elements.
 *
 * @tsplus fluent ets/Stream sliding
 */
export function sliding_<R, E, A>(
  self: Stream<R, E, A>,
  chunkSize: number,
  stepSize = 1,
  __tsplusTrace?: string
): Stream<R, E, Chunk<A>> {
  if (chunkSize <= 0 || stepSize <= 0) {
    return Stream.die(
      new IllegalArgumentException(
        "Invalid bounds - `chunkSize` and `stepSize` must be greater than 0"
      )
    )
  }
  return Stream.succeed(new RingBufferNew<A>(chunkSize)).flatMap((queue) => {
    concreteStream(self)
    return new StreamInternal(
      self.channel >> reader<E, A>(chunkSize, stepSize, queue, 0)
    )
  })
}

/**
 * Emits a sliding window of `n` elements.
 *
 * @tsplus static ets/Stream/Aspects sliding
 */
export const sliding = Pipeable(sliding_)

function reader<E, A>(
  chunkSize: number,
  stepSize: number,
  queue: RingBufferNew<A>,
  queueSize: number,
  __tsplusTrace?: string
): Channel<never, E, Chunk<A>, unknown, E, Chunk<Chunk<A>>, unknown> {
  return Channel.readWithCause(
    (input: Chunk<A>) =>
      Channel.write(
        input.zipWithIndex().collect(({ tuple: [a, index] }) => {
          queue.put(a)

          const currentIndex = queueSize + index + 1

          return currentIndex < chunkSize || (currentIndex - chunkSize) % stepSize > 0
            ? Option.none
            : Option.some(queue.toChunk())
        })
      ) > reader<E, A>(chunkSize, stepSize, queue, queueSize + input.length),
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
  channelEnd: Channel<never, E, Chunk<A>, unknown, E, Chunk<Chunk<A>>, unknown>,
  __tsplusTrace?: string
): Channel<never, E, Chunk<A>, unknown, E, Chunk<Chunk<A>>, unknown> {
  if (queueSize < chunkSize) {
    const items = queue.toChunk()
    const result = items.isEmpty() ? Chunk.empty<Chunk<A>>() : Chunk.single(items)
    return Channel.write(result) > channelEnd
  }

  const lastEmitIndex = queueSize - ((queueSize - chunkSize) % stepSize)

  if (lastEmitIndex === queueSize) {
    return channelEnd
  }

  const leftovers = queueSize - (lastEmitIndex - chunkSize + stepSize)
  const lastItems = queue.toChunk().takeRight(leftovers)
  const result = lastItems.isEmpty() ? Chunk.empty<Chunk<A>>() : Chunk.single(lastItems)

  return Channel.write(result) > channelEnd
}
