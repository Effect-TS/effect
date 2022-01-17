import type { Cause } from "../../Cause"
import { failCause as effectFailCause } from "../../Effect/operations/failCause"
import type { Managed } from "../definition"
import { fromEffect } from "./fromEffect"

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function failCause<E>(
  cause: Cause<E>,
  __trace?: string
): Managed<unknown, E, never> {
  return fromEffect(effectFailCause(cause, __trace))
}
