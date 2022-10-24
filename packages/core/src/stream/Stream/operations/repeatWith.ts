import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition and can
 * be unified with the stream elements using the provided functions.
 *
 * @tsplus static effect/core/stream/Stream.Aspects repeatWith
 * @tsplus pipeable effect/core/stream/Stream repeatWith
 * @category repetition
 * @since 1.0.0
 */
export function repeatWith<A, S, R2, B, C1, C2>(
  schedule: Schedule<S, R2, unknown, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E, C1 | C2> =>
    new StreamInternal(
      Channel.fromEffect(schedule.driver).flatMap((driver) => {
        const scheduleOutput = driver.last.orDie.map(g)
        const stream = self.map(f)
        concreteStream(stream)
        const process = stream.channel

        const loop: Channel<
          R | R2,
          unknown,
          unknown,
          unknown,
          E,
          Chunk.Chunk<C1 | C2>,
          void
        > = Channel.unwrap(
          driver.next(undefined).fold(
            () => Channel.unit,
            () =>
              process.flatMap(() =>
                Channel.unwrap(
                  scheduleOutput.map((c) => Channel.write(Chunk.single(c)))
                )
              ).flatMap(() => loop)
          )
        )

        return process.flatMap(() => loop)
      })
    )
}
