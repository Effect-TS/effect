import * as Option from "@fp-ts/data/Option"

/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter effect/core/stream/Stream some
 * @category getters
 * @since 1.0.0
 */
export function some<R, E, A>(
  self: Stream<R, E, Option.Option<A>>
): Stream<R, Option.Option<E>, A> {
  return self.mapError(Option.some).someOrFail(Option.none)
}
