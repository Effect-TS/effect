import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Creates a pipeline that drops elements while the specified predicate
 * evaluates to `true`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects dropWhile
 * @tsplus pipeable effect/core/stream/Stream dropWhile
 * @category mutations
 * @since 1.0.0
 */
export function dropWhile<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> dropWhileInternal<E, A>(f))
  }
}

function dropWhileInternal<E, A>(
  f: Predicate<A>
): Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk.Chunk<A>) => {
      const out = pipe(chunk, Chunk.dropWhile(f))
      return Chunk.isEmpty(out)
        ? dropWhileInternal<E, A>(f)
        : Channel.write(out).flatMap(() => Channel.identity<E, Chunk.Chunk<A>, unknown>())
    },
    (err) => Channel.fail(err),
    (out) => Channel.succeed(out)
  )
}
