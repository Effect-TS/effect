/**
 * Terminates the stream when encountering the first `Left`.
 *
 * @tsplus getter effect/core/stream/Stream collectWhileRight
 */
export function collectWhileRight<R, E, L, A>(
  self: Stream<R, E, Either<L, A>>
): Stream<R, E, A> {
  return self.collectWhile((either) => either.isRight() ? Maybe.some(either.right) : Maybe.none)
}
