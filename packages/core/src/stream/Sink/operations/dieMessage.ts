import type { LazyArg } from "../../../data/Function"
import { Cause, RuntimeError } from "../../../io/Cause"
import { Sink } from "../definition"

/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeError`.
 *
 * @tsplus static ets/SinkOps dieMessage
 */
export function dieMessage(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, never, never> {
  return Sink.failCause(Cause.die(new RuntimeError(message())))
}
