import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * effectful predicate.
 *
 * @tsplus static effect/core/stream/Stream.Aspects findEffect
 * @tsplus pipeable effect/core/stream/Stream findEffect
 * @category elements
 * @since 1.0.0
 */
export function findEffect<R1, E1, A>(f: (a: A) => Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R1, E | E1, A> => {
    const loop: Channel<
      R1,
      E,
      Chunk.Chunk<A>,
      unknown,
      E | E1,
      Chunk.Chunk<A>,
      any
    > = Channel.readWith(
      (chunk: Chunk.Chunk<A>) =>
        Channel.unwrap(
          Effect.find(chunk, f).map((option) => {
            switch (option._tag) {
              case "None": {
                return loop
              }
              case "Some": {
                return Channel.write(Chunk.single(option.value))
              }
            }
          })
        ),
      (e) => Channel.fail(e),
      () => Channel.unit
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
