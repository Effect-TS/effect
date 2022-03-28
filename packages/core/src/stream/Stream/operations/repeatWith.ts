import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import type { Schedule } from "../../../io/Schedule"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition and can
 * be unified with the stream elements using the provided functions.
 *
 * @tsplus fluent ets/Stream repeatWith
 */
export function repeatWith_<R, E, A, S, R2, B, C1, C2>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R2, unknown, B>>,
  f: (a: A) => C1,
  g: (b: B) => C2,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E, C1 | C2>
export function repeatWith_<R, E, A, R2, B, C1, C2>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule<R2, unknown, B>>,
  f: (a: A) => C1,
  g: (b: B) => C2,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E, C1 | C2> {
  return new StreamInternal(
    Channel.fromEffect(schedule().driver()).flatMap((driver) => {
      const scheduleOutput = driver.last.orDie().map(g)
      const stream = self.map(f)
      concreteStream(stream)
      const process = stream.channel

      const loop: Channel<
        R & R2 & HasClock,
        unknown,
        unknown,
        unknown,
        E,
        Chunk<C1 | C2>,
        void
      > = Channel.unwrap(
        driver.next(undefined).fold(
          () => Channel.unit,
          () =>
            process >
            Channel.unwrap(scheduleOutput.map((c) => Channel.write(Chunk.single(c)))) >
            loop
        )
      )

      return process > loop
    })
  )
}

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition and can
 * be unified with the stream elements using the provided functions.
 */
export const repeatWith = Pipeable(repeatWith_)
