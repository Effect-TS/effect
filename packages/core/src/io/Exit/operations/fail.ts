import { Cause } from "../../Cause"
import { Exit } from "../definition"

/**
 * @tsplus static ets/ExitOps fail
 */
export function fail<E>(error: E): Exit<E, never> {
  return Exit.failCause(Cause.fail(error))
}
