import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results of type `S` given an initial S.
 *
 * @tsplus static effect/core/stream/Stream.Aspects scanEffect
 * @tsplus pipeable effect/core/stream/Stream scanEffect
 */
export function scanEffect<A, S, R2, E2>(
  s: LazyArg<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, S> =>
    new StreamInternal(
      Channel.sync(s).flatMap((s) =>
        Channel.write(Chunk.single(s)).zipRight(() => {
          const stream = self.mapAccumEffect(s, (s, a) => f(s, a).map((s) => Tuple(s, s)))
          concreteStream(stream)
          return stream.channel
        })
      )
    )
}
