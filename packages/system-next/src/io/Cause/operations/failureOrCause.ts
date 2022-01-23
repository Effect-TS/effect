import * as E from "../../../data/Either/core"
import * as O from "../../../data/Option/core"
import type { Cause } from "../definition"
import { failureOption } from "./failureOption"

/**
 * Retrieve the first checked error on the `Left` if available, if there are
 * no checked errors return the rest of the `Cause` that is known to contain
 * only `Die` or `Interrupt` causes.
 */
export function failureOrCause<E>(self: Cause<E>): E.Either<E, Cause<never>> {
  return O.fold_(
    failureOption(self),
    () => E.right(self as Cause<never>), // no E inside this cause, can safely cast
    (error) => E.left(error)
  )
}
