import type { Either } from "../../Either"
import { left } from "../../Either"
import type { Effect } from "../definition"
import { mapError_ } from "./mapError"

/**
 * Maps the error value of this effect to a left value.
 */
export function asLeftError<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, Either<E, never>, A> {
  return mapError_(self, left)
}
