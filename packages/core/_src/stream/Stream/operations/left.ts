/**
 * Fails with the error `None` if value is `Right`.
 *
 * @tsplus getter ets/Stream left
 */
export function left<R, E, A1, A2>(
  self: Stream<R, E, Either<A1, A2>>,
  __tsplusTrace?: string
): Stream<R, Maybe<E>, A2> {
  return self.mapError(Maybe.some).rightOrFail(Maybe.none)
}
