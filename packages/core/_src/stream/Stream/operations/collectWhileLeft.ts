/**
 * Terminates the stream when encountering the first `Right`.
 *
 * @tsplus getter effect/core/stream/Stream collectWhileLeft
 */
export function collectWhileLeft<R, E, L, A>(
  self: Stream<R, E, Either<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, L> {
  return self.collectWhile((either) => either.isLeft() ? Maybe.some(either.left) : Maybe.none)
}
