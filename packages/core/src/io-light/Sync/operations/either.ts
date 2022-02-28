import type { Either } from "../../../data/Either"
import type { Sync } from "../definition"
import { concreteXPure } from "../definition"

/**
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 *
 * @tsplus fluent ets/Sync either
 */
export function either<R, E, A>(self: Sync<R, E, A>): Sync<R, never, Either<E, A>> {
  concreteXPure(self)
  return self.either()
}
