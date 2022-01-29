import { Option } from "../../../data/Option/core"
import type { Cause } from "../definition"

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 *
 * @ets fluent ets/Cause failureOption
 */
export function failureOption<E>(self: Cause<E>): Option<E> {
  return self.find((cause) =>
    cause.isFailType() ? Option.some(cause.value) : Option.none
  )
}
