/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter ets/Stream some
 */
export function some<R, E, A>(
  self: Stream<R, E, Maybe<A>>,
  __tsplusTrace?: string
): Stream<R, Maybe<E>, A> {
  return self.mapError(Maybe.some).someOrFail(Maybe.none)
}
