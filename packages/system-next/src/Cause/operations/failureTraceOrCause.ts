// ets_tracing: off

import type { Tuple } from "../../Collections/Immutable/Tuple"
import * as E from "../../Either"
import type { Trace } from "../../Trace"
import type { Cause } from "../definition"
import { failureTraceOption } from "./failureTraceOption"

/**
 * Retrieve the first checked error and its trace on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause` that is known
 * to contain only `Die` or `Interrupt` causes.
 */
export function failureTraceOrCause<E>(
  self: Cause<E>
): E.Either<Tuple<[E, Trace]>, Cause<never>> {
  const result = failureTraceOption(self)
  switch (result._tag) {
    case "Some":
      return E.left(result.value)
    case "None":
      return E.right(self as Cause<never>)
  }
}
