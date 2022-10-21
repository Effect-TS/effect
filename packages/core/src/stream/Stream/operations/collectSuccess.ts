/**
 * Filters any `Exit.Failure` values.
 *
 * @tsplus getter effect/core/stream/Stream collectSuccess
 */
export function collectSuccess<R, E, L, A>(
  self: Stream<R, E, Exit<L, A>>
): Stream<R, E, A> {
  return self.collect((exit) => exit.isSuccess() ? Maybe.some(exit.value) : Maybe.none)
}
