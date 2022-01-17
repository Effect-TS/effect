import type { Either } from "../../Either"
import { left, right } from "../../Either"
import type { Managed } from "../definition"
import { fold_ } from "./fold"

/**
 * Returns an effect whose failure and success have been lifted into an
 * `Either`. The resulting effect cannot fail.
 */
export function either<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, Either<E, A>> {
  return fold_(self, left, right, __trace)
}
