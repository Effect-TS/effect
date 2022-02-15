import { Either } from "../../../data/Either"
import type { Managed } from "../definition"

/**
 * Returns an effect whose failure and success have been lifted into an
 * `Either`. The resulting effect cannot fail.
 *
 * @tsplus fluent ets/Managed either
 */
export function either<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, never, Either<E, A>> {
  return self.fold(Either.left, Either.right)
}
