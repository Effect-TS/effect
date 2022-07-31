/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus getter effect/core/io/Effect none
 */
export function none<R, E, A>(self: Effect<R, E, Maybe<A>>): Effect<R, Maybe<E>, void> {
  return self.foldEffect(
    (e) => Effect.failSync(Maybe.some(e)),
    (option) => option.fold(Effect.succeed(undefined), () => Effect.failSync(Maybe.none))
  )
}
