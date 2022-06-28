import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

/**
 * Returns whether this effect is a failure.
 *
 * @tsplus getter effect/core/io/Effect isFailure
 */
export function isFailure<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, never, boolean> {
  return self.fold(constTrue, constFalse)
}
