import { Cause } from "../../Cause"
import { Exit } from "../definition"

/**
 * @tsplus static ets/ExitOps die
 */
export function die(defect: unknown): Exit<never, never> {
  return Exit.failCause(Cause.die(defect))
}
