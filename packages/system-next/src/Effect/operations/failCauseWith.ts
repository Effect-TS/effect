// ets_tracing: off

import type { Cause } from "../../Cause"
import type { IO } from "../definition"
import { IFail } from "../definition"

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function failCauseWith<E>(f: () => Cause<E>, __trace?: string): IO<E, never> {
  return new IFail(f, __trace)
}
