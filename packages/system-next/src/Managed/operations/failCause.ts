// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { fromEffect } from "./fromEffect"

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function failCause<E>(
  cause: Cause<E>,
  __trace?: string
): Managed<unknown, E, never> {
  return fromEffect(T.failCause(cause, __trace))
}
