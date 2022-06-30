/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter effect/core/io/Effect some
 */
export function some<R, E, A>(
  self: Effect<R, E, Maybe<A>>,
  __tsplusTrace?: string
): Effect<R, Maybe<E>, A> {
  return self.foldEffect(
    (e) => Effect.fail(Maybe.some(e)),
    (option) => option.fold(Effect.fail(Maybe.none), Effect.succeedNow)
  )
}
