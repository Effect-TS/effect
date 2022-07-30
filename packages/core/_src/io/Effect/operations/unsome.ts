/**
 * Converts an option on errors into an option on values.
 *
 * @tsplus getter effect/core/io/Effect unsome
 */
export function unsome<R, E, A>(
  self: Effect<R, Maybe<E>, A>,
  __tsplusTrace?: string
): Effect<R, E, Maybe<A>> {
  return self.foldEffect(
    (option) => option.fold(Effect.succeed(Maybe.none), Effect.fail),
    (a) => Effect.succeed(Maybe.some(a))
  )
}
