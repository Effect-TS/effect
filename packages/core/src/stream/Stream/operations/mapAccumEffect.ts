import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapAccumEffect
 * @tsplus pipeable effect/core/stream/Stream mapAccumEffect
 * @category mapping
 * @since 1.0.0
 */
export function mapAccumEffect<A, R2, E2, A2, S>(
  s: S,
  f: (s: S, a: A) => Effect<R2, E2, readonly [S, A2]>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel.pipeTo(accumulator(s, f)))
  }
}

function accumulator<A, R2, E2, A2, S>(
  s: S,
  f: (s: S, a: A) => Effect<R2, E2, readonly [S, A2]>
): Channel<R2, unknown, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown> {
  return Channel.readWith(
    (chunk: Chunk.Chunk<A>) =>
      Channel.unwrap(
        Effect.suspendSucceed(() => {
          const builder: Array<A2> = []
          const emit = (out: A2) =>
            Effect.sync(() => {
              builder.push(out)
            })

          return Effect.reduce(chunk, s, (s, a) => f(s, a).flatMap(([s, a2]) => emit(a2).as(s)))
            .fold(
              (failure) => {
                return builder.length === 0
                  ? Channel.fail(failure)
                  : Channel.write(Chunk.unsafeFromArray(builder)).flatMap(() =>
                    Channel.fail(failure)
                  )
              },
              (out) =>
                Channel.write(Chunk.unsafeFromArray(builder)).flatMap(() => accumulator(out, f))
            )
        })
      ),
    (err) => Channel.fail(err),
    () => Channel.unit
  ) as Channel<R2, unknown, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
}
