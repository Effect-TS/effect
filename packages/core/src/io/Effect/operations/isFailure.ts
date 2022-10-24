import { constFalse, constTrue } from "@fp-ts/data/Function"

/**
 * Returns whether this effect is a failure.
 *
 * @tsplus getter effect/core/io/Effect isFailure
 * @category getters
 * @since 1.0.0
 */
export function isFailure<R, E, A>(self: Effect<R, E, A>): Effect<R, never, boolean> {
  return self.fold(constTrue, constFalse)
}
