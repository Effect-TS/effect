import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

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
          Chunk<A>,
          void
        > = Channel.fromEffect(queue.take).flatMap((exit) =>
          exit.fold(
            (cause) =>
              Cause.flipCauseMaybe<E>(cause).fold(() => Channel.unit, (cause) =>
                Channel.failCause(cause)),
            (a) =>
              Channel.write(Chunk.single(a)) > process
          )
        )
        return process
      }))
    )
  }
}
