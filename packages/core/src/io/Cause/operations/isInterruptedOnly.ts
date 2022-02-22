import { constTrue } from "../../../data/Function"
import { Option } from "../../../data/Option/core"
import type { Cause } from "../definition"

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 *
 * @tsplus fluent ets/Cause isInterruptedOnly
 */
export function isInterruptedOnly<E>(self: Cause<E>): boolean {
  return self
    .find((cause) =>
      cause.isDieType() || cause.isFailType() ? Option.some(false) : Option.none
    )
    .getOrElse(constTrue)
}
