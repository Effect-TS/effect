// ets_tracing: off

import * as O from "../../Option"
import type { Cause } from "../definition"
import { isFailType } from "../definition"
import { find_ } from "./find"

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export function failureOption<E>(self: Cause<E>): O.Option<E> {
  return find_(self, (cause) => (isFailType(cause) ? O.some(cause.value) : O.none))
}
