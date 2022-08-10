import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapAccumEffect
 * @tsplus pipeable effect/core/stream/Stream mapAccumEffect
 */
export function mapAccumEffect<A, R2, E2, A2, S>(
  s: S,
  f: (s: S, a: A) => Effect<R2, E2, Tuple<[S, A2]>>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> accumulator(s, f))
  }
}

function accumulator<A, R2, E2, A2, S>(
  s: S,
  f: (s: S, a: A) => Effect<R2, E2, Tuple<[S, A2]>>
): Channel<R2, unknown, Chunk<A>, unknown, E2, Chunk<A2>, unknown> {
  return Channel.readWith(
    (chunk: Chunk<A>) =>
      Channel.unwrap(
        Effect.suspendSucceed(() => {
          const outputChunk = Chunk.builder<A2>()
          const emit = (out: A2) =>
            Effect.sync(() => {
              outputChunk.append(out)
            })

          return Effect.reduce(chunk, s, (s, a) =>
            f(s, a).flatMap(({ tuple: [s, a2] }) =>
              emit(a2).as(s)
            )).fold(
              (failure) => {
                const partialResult = outputChunk.build()
                return partialResult.isNonEmpty
                  ? Channel.write(partialResult) > Channel.failSync(failure)
                  : Channel.failSync(failure)
              },
              (out) => Channel.write(outputChunk.build()) > accumulator(out, f)
            )
        })
      ),
    (err) => Channel.failSync(err),
    () => Channel.unit
  ) as Channel<R2, unknown, Chunk<A>, unknown, E2, Chunk<A2>, unknown>
}
