import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Option } from "@fp-ts/data/Option"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects refineOrDieWith
 * @tsplus pipeable effect/core/stream/Stream refineOrDieWith
 * @category mutations
 * @since 1.0.0
 */
export function refineOrDieWith<E, E2>(
  pf: (e: E) => Option<E2>,
  f: (e: E) => unknown
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R, E2, A> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.catchAll((e) => {
        const option = pf(e)
        switch (option._tag) {
          case "None": {
            return Channel.failCauseSync(Cause.die(f(e)))
          }
          case "Some": {
            return Channel.fail(option.value)
          }
        }
      })
    )
  }
}
