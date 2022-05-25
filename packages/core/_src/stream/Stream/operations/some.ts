/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter ets/Stream some
 */
export function some<R, E, A>(
  self: Stream<R, E, Option<A>>,
  __tsplusTrace?: string
): Stream<R, Option<E>, A> {
  return self.mapError(Option.some).someOrFail(Option.none)
}
