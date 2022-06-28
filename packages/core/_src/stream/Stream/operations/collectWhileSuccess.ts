/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 *
 * @tsplus getter effect/core/stream/Stream collectWhileSuccess
 */
export function collectWhileSuccess<R, E, L, A>(
  self: Stream<R, E, Exit<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.collectWhile((exit) => exit.isSuccess() ? Maybe.some(exit.value) : Maybe.none)
}
