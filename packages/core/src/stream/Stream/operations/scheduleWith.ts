import type { Driver } from "@effect/core/io/Schedule/Driver"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Schedules the output of the stream using the provided `schedule` and emits
 * its output at the end (if `schedule` is finite). Uses the provided function
 * to align the stream and schedule outputs on the same type.
 *
 * @tsplus static effect/core/stream/Stream.Aspects scheduleWith
 * @tsplus pipeable effect/core/stream/Stream scheduleWith
 * @category mutations
 * @since 1.0.0
 */
export function scheduleWith<S, R2, A, B, C, D>(
  schedule: Schedule<S, R2, A, B>,
  f: (a: A) => C,
  g: (b: B) => D
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E, C | D> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.fromEffect(schedule.driver).flatMap(
        (driver) => self.channel.pipeTo(loop<R, R2, E, A, B, C, D>(driver, Chunk.empty, f, g, 0))
      )
    )
  }
}

function loop<R, R2, E, A, B, C, D>(
  driver: Driver<unknown, R2, A, B>,
  chunk: Chunk.Chunk<A>,
  f: (a: A) => C,
  g: (b: B) => D,
  index: number
): Channel<R | R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C | D>, unknown> {
  if (index < chunk.length) {
    const a = pipe(chunk, Chunk.unsafeGet(index))
    const channel = driver.next(a).foldEffect(
      () =>
        driver.last
          .orDie
          .map(
            (b) =>
              Channel.write(Chunk.make(f(a), g(b))).flatMap(() =>
                loop<R, R2, E, A, B, C, D>(driver, chunk, f, g, index + 1)
              )
          ) < driver.reset,
      () =>
        Effect.succeed(
          Channel.write(Chunk.single(f(a))).flatMap(() =>
            loop<R, R2, E, A, B, C, D>(driver, chunk, f, g, index + 1)
          )
        )
    )
    return Channel.unwrap(channel)
  }
  return Channel.readWithCause(
    (chunk: Chunk.Chunk<A>) => loop(driver, chunk, f, g, 0),
    (cause) => Channel.failCause(cause),
    Channel.succeed
  )
}
