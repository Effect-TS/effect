import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Halts the evaluation of this stream when the provided IO completes. The
 * given IO will be forked as part of the returned stream, and its success
 * will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the
 * IO completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 *
 * @tsplus static effect/core/stream/Stream.Aspects haltWhen
 * @tsplus pipeable effect/core/stream/Stream haltWhen
 */
export function haltWhen<R2, E2, Z>(io: Effect<R2, E2, Z>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.unwrapScoped(
        io.forkScoped.map((fiber) => self.channel >> writer<R, E, A, R2, E2, Z>(fiber))
      )
    )
  }
}

function writer<R, E, A, R2, E2, Z>(
  fiber: Fiber<E2, Z>
): Channel<R | R2, E, Chunk<A>, unknown, E | E2, Chunk<A>, void> {
  return Channel.unwrap(
    fiber.poll.map((option) =>
      option.fold(
        Channel.readWith(
          (input: Chunk<A>) =>
            Channel.write(input).flatMap(() => writer<R, E, A, R2, E2, Z>(fiber)),
          (err) => Channel.fail(err),
          () => Channel.unit
        ),
        (exit) =>
          exit.fold(
            (cause) => Channel.failCause(cause),
            (): Channel<R | R2, E | E2, Chunk<A>, unknown, E | E2, Chunk<A>, void> => Channel.unit
          )
      )
    )
  )
}
