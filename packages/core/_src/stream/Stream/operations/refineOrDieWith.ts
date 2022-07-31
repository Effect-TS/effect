import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects refineOrDieWith
 * @tsplus pipeable effect/core/stream/Stream refineOrDieWith
 */
export function refineOrDieWith<E, E2>(
  pf: (e: E) => Maybe<E2>,
  f: (e: E) => unknown
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R, E2, A> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.catchAll((e) =>
        pf(e).fold(
          Channel.failCause(Cause.die(f(e))),
          (e2) => Channel.fail(e2)
        )
      )
    )
  }
}
