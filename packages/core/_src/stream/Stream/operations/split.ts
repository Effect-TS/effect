import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Splits elements based on a predicate.
 *
 * @tsplus static effect/core/stream/Stream.Aspects split
 * @tsplus pipeable effect/core/stream/Stream split
 */
export function split<A>(f: Predicate<A>, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, Chunk<A>> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> loop<R, E, A>(Chunk.empty(), f))
  }
}

function splitInternal<R, E, A>(
  leftovers: Chunk<A>,
  input: Chunk<A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, E, Chunk<Chunk<A>>, unknown> {
  const {
    tuple: [chunk, remaining]
  } = (leftovers + input).splitWhere(f)
  return chunk.isEmpty || remaining.isEmpty
    ? loop<R, E, A>(chunk + remaining.drop(1), f)
    : Channel.write(Chunk.single(chunk)) >
      splitInternal<R, E, A>(Chunk.empty<A>(), remaining.drop(1), f)
}

function loop<R, E, A>(
  leftovers: Chunk<A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, E, Chunk<Chunk<A>>, unknown> {
  return Channel.readWith(
    (input: Chunk<A>) => splitInternal<R, E, A>(leftovers, input, f),
    (err) => Channel.fail(err),
    () =>
      leftovers.isEmpty
        ? Channel.unit
        : leftovers.find(f).isNone()
        ? Channel.write(Chunk.single(leftovers)) > Channel.unit
        : splitInternal<R, E, A>(Chunk.empty<A>(), leftovers, f) > Channel.unit
  )
}
