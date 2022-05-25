/**
 * Maps the error value of this effect to an optional value.
 *
 * @tsplus fluent ets/Effect asSomeError
 */
export function asSomeError<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, Option<E>, A> {
  return self.mapError(Option.some)
}
