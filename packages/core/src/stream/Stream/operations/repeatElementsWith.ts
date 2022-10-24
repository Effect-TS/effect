import type { Driver } from "@effect/core/io/Schedule/Driver"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Repeats each element of the stream using the provided schedule. When the
 * schedule is finished, then the output of the schedule will be emitted into
 * the stream. Repetitions are done in addition to the first execution, which
 * means using `Schedule.recurs(1)` actually results in the original effect,
 * plus an additional recurrence, for a total of two repetitions of each value
 * in the stream.
 *
 * This function accepts two conversion functions, which allow the output of
 * this stream and the output of the provided schedule to be unified into a
 * single type. For example, `Either` or similar data type.
 *
 * @tsplus static effect/core/stream/Stream.Aspects repeatElementsWith
 * @tsplus pipeable effect/core/stream/Stream repeatElementsWith
 * @category repetition
 * @since 1.0.0
 */
export function repeatElementsWith<A, S, R2, B, C1, C2>(
  schedule: Schedule<S, R2, unknown, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E, C1 | C2> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel >>
        Channel.unwrap(
          schedule.driver
            .map((driver) => {
              const loop: Channel<
                R | R2,
                E,
                Chunk.Chunk<A>,
                unknown,
                E,
                Chunk.Chunk<C1 | C2>,
                void
              > = Channel.readWith(
                (chunk: Chunk.Chunk<A>) => feed<R, E, A, R2, B, C1, C2>(loop, driver, f, g, chunk),
                (err) => Channel.fail(err),
                () => Channel.unit
              )

              return loop
            })
        )
    )
  }
}

function feed<R, E, A, R2, B, C1, C2>(
  loop: Channel<R | R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C1 | C2>, void>,
  driver: Driver<unknown, R2, unknown, B>,
  f: (a: A) => C1,
  g: (b: B) => C2,
  input: Chunk.Chunk<A>
): Channel<R | R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C1 | C2>, void> {
  const option = Chunk.head(input)
  switch (option._tag) {
    case "None": {
      return loop
    }
    case "Some": {
      return Channel.write(Chunk.single(f(option.value))).flatMap(() =>
        step<R, E, A, R2, B, C1, C2>(loop, driver, f, g, pipe(input, Chunk.drop(1)), option.value)
      )
    }
  }
}

function step<R, E, A, R2, B, C1, C2>(
  loop: Channel<R | R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C1 | C2>, void>,
  driver: Driver<unknown, R2, unknown, B>,
  f: (a: A) => C1,
  g: (b: B) => C2,
  input: Chunk.Chunk<A>,
  value: A
): Channel<R | R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C1 | C2>, void> {
  const advance = driver
    .next(value)
    .as(
      Channel.write(Chunk.single(f(value))).flatMap(() =>
        step<R, E, A, R2, B, C1, C2>(loop, driver, f, g, input, value)
      )
    )
  const reset: Effect<
    R | R2,
    never,
    Channel<R | R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C1 | C2>, void>
  > = driver.last.orDie.tap(() => driver.reset).map(
    (b) =>
      Channel.write(Chunk.single(g(b))).flatMap(() =>
        feed<R, E, A, R2, B, C1, C2>(loop, driver, f, g, input)
      )
  )
  return Channel.unwrap(advance | reset)
}
