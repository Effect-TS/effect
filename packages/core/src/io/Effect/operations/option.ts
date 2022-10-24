import * as Option from "@fp-ts/data/Option"

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @tsplus getter effect/core/io/Effect option
 * @category mutations
 * @since 1.0.0
 */
export function option<R, E, A>(self: Effect<R, E, A>): Effect<R, never, Option.Option<A>> {
  return self.foldEffect(
    () => Effect.succeed(Option.none),
    (a) => Effect.succeed(Option.some(a))
  )
}
