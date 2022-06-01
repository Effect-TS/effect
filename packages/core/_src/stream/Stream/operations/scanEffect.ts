import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results of type `S` given an initial S.
 *
 * @tsplus fluent ets/Stream scanEffect
 */
export function scanEffect_<R, E, A, S, R2, E2>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, S> {
  return new StreamInternal(
    Channel.succeed(s).flatMap((s) =>
      Channel.write(Chunk.single(s)).zipRight(() => {
        const stream = self.mapAccumEffect(s, (s, a) => f(s, a).map((s) => Tuple(s, s)))
        concreteStream(stream)
        return stream.channel
      })
    )
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * all intermediate results of type `S` given an initial S.
 *
 * @tsplus static ets/Stream/Aspects scanEffect
 */
export const scanEffect = Pipeable(scanEffect_)
