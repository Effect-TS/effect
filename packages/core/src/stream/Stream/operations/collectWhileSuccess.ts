import * as Option from "@fp-ts/data/Option"

/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 *
 * @tsplus getter effect/core/stream/Stream collectWhileSuccess
 * @category mutations
 * @since 1.0.0
 */
export function collectWhileSuccess<R, E, L, A>(
  self: Stream<R, E, Exit<L, A>>
): Stream<R, E, A> {
  return self.collectWhile((exit) =>
    exit.isSuccess() ?
      Option.some(exit.value) :
      Option.none
  )
}
