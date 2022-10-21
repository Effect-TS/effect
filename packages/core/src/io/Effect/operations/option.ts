/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @tsplus getter effect/core/io/Effect option
 */
export function option<R, E, A>(self: Effect<R, E, A>): Effect<R, never, Maybe<A>> {
  return self.foldEffect(
    () => Effect.succeed(Maybe.none),
    (a) => Effect.succeed(Maybe.some(a))
  )
}
