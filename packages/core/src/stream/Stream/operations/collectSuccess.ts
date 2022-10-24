import * as Option from "@fp-ts/data/Option"

/**
 * Filters any `Exit.Failure` values.
 *
 * @tsplus getter effect/core/stream/Stream collectSuccess
 * @category mutations
 * @since 1.0.0
 */
export function collectSuccess<R, E, L, A>(
  self: Stream<R, E, Exit<L, A>>
): Stream<R, E, A> {
  return self.collect((exit) => exit.isSuccess() ? Option.some(exit.value) : Option.none)
}
