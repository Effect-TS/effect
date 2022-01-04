// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Exit } from "../definition"
import { Failure } from "../definition"

export function failCause<E>(cause: Cause<E>): Exit<E, never> {
  return new Failure(cause)
}
