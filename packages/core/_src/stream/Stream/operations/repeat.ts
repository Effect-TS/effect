import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 *
 * @tsplus static effect/core/stream/Stream.Aspects repeat
 * @tsplus pipeable effect/core/stream/Stream repeat
 */
export function repeatNow<S, R2, B>(schedule: Schedule<S, R2, unknown, B>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E, A> =>
    self.repeatEither(schedule).collectRight
}

/**
 * Repeats the provided value infinitely.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeat
 */
export function repeat<A>(a: A): Stream<never, never, A> {
  return new StreamInternal(
    Channel.sync(a).flatMap((a) => Channel.write(Chunk.single(a)).repeated)
  )
}
