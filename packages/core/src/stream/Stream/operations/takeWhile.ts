import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Creates a pipeline that takes elements while the specified predicate
 * evaluates to `true`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects takeWhile
 * @tsplus pipeable effect/core/stream/Stream takeWhile
 * @category mutations
 * @since 1.0.0
 */
export function takeWhile<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const loop: Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> = Channel
      .readWith(
        (chunk: Chunk.Chunk<A>) => {
          const taken = pipe(chunk, Chunk.takeWhile(f))
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
