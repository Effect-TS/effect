import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` elements in a queue.
 *
 * This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus static effect/core/stream/Stream.Aspects buffer
 * @tsplus pipeable effect/core/stream/Stream buffer
 * @category buffering
 * @since 1.0.0
 */
export function buffer(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const queue = self.toQueueOfElements(capacity)
    return new StreamInternal(
      Channel.unwrapScoped(queue.map((queue) => {
        const process: Channel<
          never,
          unknown,
          unknown,
          unknown,
          E,
          Chunk.Chunk<A>,
          void
        > = Channel.fromEffect(queue.take).flatMap((exit) =>
          exit.fold(
            (cause) => {
              const option = Cause.flipCauseOption(cause)
              switch (option._tag) {
                case "None": {
                  return Channel.unit
                }
                case "Some": {
                  return Channel.failCause(option.value)
                }
              }
            },
            (a) => Channel.write(Chunk.single(a)).flatMap(() => process)
          )
        )
        return process
      }))
    )
  }
}
