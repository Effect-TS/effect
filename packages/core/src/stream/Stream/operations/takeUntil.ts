import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Takes all elements of the stream until the specified predicate evaluates to
 * `true`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects takeUntil
 * @tsplus pipeable effect/core/stream/Stream takeUntil
 * @category mutations
 * @since 1.0.0
 */
export function takeUntil<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const loop: Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> = Channel
      .readWith(
        (chunk: Chunk.Chunk<A>) => {
          const taken = pipe(chunk, Chunk.takeWhile((a) => !f(a)))
          const last = pipe(chunk, Chunk.drop(taken.length), Chunk.take(1))
          return Chunk.isEmpty(last) ?
            Channel.write(taken).flatMap(() => loop) :
            Channel.write(pipe(taken, Chunk.concat(last)))
        },
        (err) => Channel.fail(err),
        (done) => Channel.succeed(done)
      )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
