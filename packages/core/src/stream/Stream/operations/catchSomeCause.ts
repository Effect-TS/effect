import type { Option } from "@fp-ts/data/Option"

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some errors. Allows recovery from all causes of failure,
 * including interruption if the stream is uninterruptible.
 *
 * @tsplus static effect/core/stream/Stream.Aspects catchSomeCause
 * @tsplus pipeable effect/core/stream/Stream catchSomeCause
 * @category alternatives
 * @since 1.0.0
 */
export function catchSomeCause<E, R2, E2, A2>(
  pf: (cause: Cause<E>) => Option<Stream<R2, E2, A2>>
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A | A2> =>
    self.catchAllCause(
      (cause): Stream<R2, E | E2, A2> => {
        const option = pf(cause)
        switch (option._tag) {
          case "None": {
            return Stream.failCause(cause)
          }
          case "Some": {
            return option.value
          }
        }
      }
    )
}
