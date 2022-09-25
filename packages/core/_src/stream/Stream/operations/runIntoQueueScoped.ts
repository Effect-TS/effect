import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runIntoQueueScoped
 * @tsplus pipeable effect/core/stream/Stream runIntoQueueScoped
 */
export function runIntoQueueScoped<E1, A>(queue: Enqueue<Take<E1, A>>) {
  return <R, E extends E1>(self: Stream<R, E, A>): Effect<R | Scope, E | E1, void> => {
    const writer: Channel<
      R,
      E,
      Chunk<A>,
      unknown,
      E,
      Take<E | E1, A>,
      unknown
    > = Channel.readWithCause(
      (input: Chunk<A>) => Channel.write(Take.chunk(input)).flatMap(() => writer),
      (cause) => Channel.write(Take.failCause(cause)),
      () => Channel.write(Take.end)
    )
    concreteStream(self)
    return (self.channel >> writer)
      .mapOutEffect((take) => queue.offer(take))
      .drain
      .runScoped
      .unit
  }
}
