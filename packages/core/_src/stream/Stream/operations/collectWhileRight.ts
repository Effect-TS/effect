/**
 * Terminates the stream when encountering the first `Left`.
 *
 * @tsplus fluent ets/Stream collectWhileRight
 */
export function collectWhileRight<R, E, L, A>(
  self: Stream<R, E, Either<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.collectWhile((either) => either.isRight() ? Option.some(either.right) : Option.none)
}
