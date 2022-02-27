import { Option } from "../../../data/Option"
import { Trace } from "../../../io/Trace"
import type { Cause } from "../definition"

/**
 * Determines if the `Cause` is traced.
 *
 * @tsplus fluent ets/Cause isTraced
 */
export function isTraced<E>(self: Cause<E>): boolean {
  return self
    .find((cause) =>
      (cause.isDieType() && cause.trace !== Trace.none) ||
      (cause.isFailType() && cause.trace !== Trace.none) ||
      (cause.isInterruptType() && cause.trace !== Trace.none)
        ? Option.some(undefined)
        : Option.none
    )
    .isSome()
}
