import { constFalse, constTrue } from "@fp-ts/data/Function"

/**
 * Returns whether this effect is a success.
 *
 * @tsplus getter effect/core/io/Effect isSuccess
 * @category getters
 * @since 1.0.0
 */
export function isSuccess<R, E, A>(self: Effect<R, E, A>): Effect<R, never, boolean> {
  return self.fold(constFalse, constTrue)
}
