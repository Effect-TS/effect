import * as Option from "@fp-ts/data/Option"

/**
 * Converts the failure channel into an `Maybe`.
 *
 * @tsplus getter effect/core/stm/STM option
 * @category getters
 * @since 1.0.0
 */
export function option<R, E, A>(self: STM<R, E, A>): STM<R, never, Option.Option<A>> {
  return self.fold(() => Option.none, Option.some)
}
