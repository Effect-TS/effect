import { Option } from "../../../data/Option/core"
import type { Cause } from "../definition"

/**
 * Returns the value associated with the first `Die` in this `Cause` if
 * one exists.
 *
 * @tsplus fluent ets/Cause dieOption
 */
export function dieOption<E>(self: Cause<E>): Option<unknown> {
  return self.find((cause) =>
    cause.isDieType() ? Option.some(cause.value) : Option.none
  )
}
