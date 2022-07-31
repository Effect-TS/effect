import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a pipeline that drops elements while the specified predicate
 * evaluates to `true`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects dropWhile
 * @tsplus pipeable effect/core/stream/Stream dropWhile
 */
export function dropWhile<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> dropWhileInternal<E, A>(f))
  }
}

function dropWhileInternal<E, A>(
  f: Predicate<A>
): Channel<never, E, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk<A>) => {
      const out = chunk.dropWhile(f)
      return out.isEmpty
        ? dropWhileInternal<E, A>(f)
        : Channel.write(out) > Channel.identity<E, Chunk<A>, unknown>()
    },
    (err) => Channel.fail(err),
    (out) => Channel.succeedNow(out)
  )
}
