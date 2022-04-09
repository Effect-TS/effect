/**
 * Terminates the stream when encountering the first `Right`.
 *
 * @tsplus fluent ets/Stream collectWhileLeft
 */
export function collectWhileLeft<R, E, L, A>(
  self: Stream<R, E, Either<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, L> {
  return self.collectWhile((either) => either.isLeft() ? Option.some(either.left) : Option.none);
}
