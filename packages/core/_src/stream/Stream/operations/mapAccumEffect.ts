import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @tsplus fluent ets/Stream mapAccumEffect
 */
export function mapAccumEffect_<R, E, A, R2, E2, A2, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => Effect<R2, E2, Tuple<[S, A2]>>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A2> {
  concreteStream(self)
  return new StreamInternal(self.channel >> accumulator(s, f))
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @tsplus static ets/Stream/Aspects mapAccumEffect
 */
export const mapAccumEffect = Pipeable(mapAccumEffect_)

function accumulator<A, R2, E2, A2, S>(
  s: LazyArg<S>,
  f: (s: S, a: A) => Effect<R2, E2, Tuple<[S, A2]>>,
  __tsplusTrace?: string
): Channel<R2, unknown, Chunk<A>, unknown, E2, Chunk<A2>, unknown> {
  return Channel.readWith(
    (chunk: Chunk<A>) =>
      Channel.unwrap(
        Effect.suspendSucceed(() => {
          const outputChunk = Chunk.builder<A2>()
          const emit = (out: A2) =>
            Effect.succeed(() => {
              outputChunk.append(out)
            })

          return Effect.reduce(chunk, s, (s, a) => f(s, a).flatMap(({ tuple: [s, a2] }) => emit(a2).as(s))).fold(
            (failure) => {
              const partialResult = outputChunk.build()
              return partialResult.isNonEmpty()
                ? Channel.write(partialResult) > Channel.fail(failure)
                : Channel.fail(failure)
            },
            (out) => Channel.write(outputChunk.build()) > accumulator(out, f)
          )
        })
      ),
    (err) => Channel.fail(err),
    () => Channel.unit
  ) as Channel<R2, unknown, Chunk<A>, unknown, E2, Chunk<A2>, unknown>
}
