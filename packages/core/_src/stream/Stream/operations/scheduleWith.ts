import type { Driver } from "@effect/core/io/Schedule/Driver"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Schedules the output of the stream using the provided `schedule` and emits
 * its output at the end (if `schedule` is finite). Uses the provided function
 * to align the stream and schedule outputs on the same type.
 *
 * @tsplus fluent ets/Stream scheduleWith
 */
export function scheduleWith_<R, E, A, S, R2, B, C>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule<S, R2, A, B>>,
  f: (a: A) => C,
  g: (b: B) => C,
  __tsplusTrace?: string
): Stream<R & R2, E, C> {
  concreteStream(self)
  return new StreamInternal(
    Channel.fromEffect(schedule().driver()).flatMap(
      (driver) => self.channel >> loop<R, R2, E, A, B, C>(driver, Chunk.empty<A>(), f, g, 0)
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits
 * its output at the end (if `schedule` is finite). Uses the provided function
 * to align the stream and schedule outputs on the same type.
 *
 * @tsplus static ets/Stream/Aspects scheduleWith
 */
export const scheduleWith = Pipeable(scheduleWith_)

function loop<R, R2, E, A, B, C>(
  driver: Driver<unknown, R2, A, B>,
  chunk: Chunk<A>,
  f: (a: A) => C,
  g: (b: B) => C,
  index: number
): Channel<R & R2, E, Chunk<A>, unknown, E, Chunk<C>, unknown> {
  if (index < chunk.length) {
    return Channel.unwrap(() => {
      const a = chunk.unsafeGet(index)
      return driver.next(a).foldEffect(
        () =>
          driver.last
            .orDie()
            .map(
              (b) =>
                Channel.write(Chunk(f(a), g(b))) >
                  loop<R, R2, E, A, B, C>(driver, chunk, f, g, index + 1)
            ) < driver.reset,
        () =>
          Effect.succeedNow(
            Channel.write(Chunk(f(a))) >
              loop<R, R2, E, A, B, C>(driver, chunk, f, g, index + 1)
          )
      )
    })
  }
  return Channel.readWithCause(
    (chunk: Chunk<A>) => loop(driver, chunk, f, g, 0),
    (cause) => Channel.failCause(cause),
    Channel.succeedNow
  )
}
