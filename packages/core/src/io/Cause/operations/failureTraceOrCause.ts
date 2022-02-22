import type { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either/core"
import type { Trace } from "../../../io/Trace/definition"
import type { Cause } from "../definition"

/**
 * Retrieve the first checked error and its trace on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause` that is known
 * to contain only `Die` or `Interrupt` causes.
 *
 * @tsplus fluent ets/Cause failureTraceOrCause
 */
export function failureTraceOrCause<E>(
  self: Cause<E>
): Either<Tuple<[E, Trace]>, Cause<never>> {
  return self
    .failureTraceOption()
    .fold(() => Either.right(self as Cause<never>), Either.left)
}
