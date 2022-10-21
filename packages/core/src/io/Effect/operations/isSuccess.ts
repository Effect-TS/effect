import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

/**
 * Returns whether this effect is a success.
 *
 * @tsplus getter effect/core/io/Effect isSuccess
 */
export function isSuccess<R, E, A>(self: Effect<R, E, A>): Effect<R, never, boolean> {
  return self.fold(constFalse, constTrue)
}
