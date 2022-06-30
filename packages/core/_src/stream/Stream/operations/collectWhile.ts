import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Transforms all elements of the stream for as long as the specified partial
 * function is defined.
 *
 * @tsplus static effect/core/stream/Stream.Aspects collectWhile
 * @tsplus pipeable effect/core/stream/Stream collectWhile
 */
export function collectWhile<A, A1>(pf: (a: A) => Maybe<A1>, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A1> => {
    const loop: Channel<
      R,
      E,
      Chunk<A>,
      unknown,
      E,
      Chunk<A1>,
      unknown
    > = Channel.readWith(
      (input: Chunk<A>) => {
        const mapped = input.collectWhile(pf)
        return mapped.size === input.size
          ? Channel.write(mapped) > loop
          : Channel.write(mapped)
      },
      (err) => Channel.fail(err),
      (done) => Channel.succeed(done)
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
