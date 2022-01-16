// ets_tracing: off

import * as O from "../../Option"
import type { Cause } from "../definition"
import { failureOption } from "./failureOption"

/**
 * Determines if the `Cause` contains a failure.
 */
export function isFailure<E>(self: Cause<E>): boolean {
  return O.isSome(failureOption(self))
}
