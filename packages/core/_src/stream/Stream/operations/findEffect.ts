import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * effectful predicate.
 *
 * @tsplus static effect/core/stream/Stream.Aspects findEffect
 * @tsplus pipeable effect/core/stream/Stream findEffect
 */
export function findEffect<R1, E1, A>(
  f: (a: A) => Effect<R1, E1, boolean>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R1, E | E1, A> => {
    const loop: Channel<
      R1,
      E,
      Chunk<A>,
      unknown,
      E | E1,
      Chunk<A>,
      any
    > = Channel.readWith(
      (chunk: Chunk<A>) =>
        Channel.unwrap(
          chunk
            .findEffect(f)
            .map((option) => option.fold(loop, (a) => Channel.write(Chunk.single(a))))
        ),
      (e) => Channel.fail(e),
      () => Channel.unit
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
