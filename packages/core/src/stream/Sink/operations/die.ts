import type { LazyArg } from "../../../data/Function"
import { Cause } from "../../../io/Cause"
import { Sink } from "../definition"

/**
 * Creates a sink halting with the specified defect.
 *
 * @tsplus static ets/SinkOps die
 */
export function die(
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, never, never> {
  return Sink.failCause(Cause.die(defect()))
}
