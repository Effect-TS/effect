import type { Cause } from "../../Cause"
import type { Exit } from "../definition"
import { Failure } from "../definition"

/**
 * @tsplus static ets/ExitOps failCause
 */
export function failCause<E>(cause: Cause<E>): Exit<E, never> {
  return new Failure(cause)
}
