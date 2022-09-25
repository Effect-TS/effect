import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a pipeline that takes elements while the specified predicate
 * evaluates to `true`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects takeWhile
 * @tsplus pipeable effect/core/stream/Stream takeWhile
 */
export function takeWhile<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const loop: Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> = Channel.readWith(
      (chunk: Chunk<A>) => {
        const taken = chunk.takeWhile(f)
        const more = taken.length === chunk.length
        return more ? Channel.write(taken).flatMap(() => loop) : Channel.write(taken)
      },
      (err) => Channel.fail(err),
      (done) => Channel.succeed(done)
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
