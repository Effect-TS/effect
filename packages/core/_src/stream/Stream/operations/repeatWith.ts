import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

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
  schedule: LazyArg<Schedule<S, R2, unknown, B>>,
  f: (a: A) => C1,
  g: (b: B) => C2,
  __tsplusTrace?: string
): Stream<R & R2, E, C1 | C2> {
  return new StreamInternal(
    Channel.fromEffect(schedule().driver()).flatMap((driver) => {
      const scheduleOutput = driver.last.orDie().map(g);
      const stream = self.map(f);
      concreteStream(stream);
      const process = stream.channel;

      const loop: Channel<
        R & R2,
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
      );

      return process > loop;
    })
  );
}

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition and can
 * be unified with the stream elements using the provided functions.
 *
 * @tsplus static ets/Stream/Aspects repeatWith
 */
export const repeatWith = Pipeable(repeatWith_);
