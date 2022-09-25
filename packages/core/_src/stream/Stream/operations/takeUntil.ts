import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Takes all elements of the stream until the specified predicate evaluates to
 * `true`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects takeUntil
 * @tsplus pipeable effect/core/stream/Stream takeUntil
 */
export function takeUntil<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const loop: Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> = Channel.readWith(
      (chunk: Chunk<A>) => {
        const taken = chunk.takeWhile((a) => !f(a))
        const last = chunk.drop(taken.length).take(1)
        return last.isEmpty ? Channel.write(taken).flatMap(() => loop) : Channel.write(taken + last)
      },
      (err) => Channel.fail(err),
      (done) => Channel.succeed(done)
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
