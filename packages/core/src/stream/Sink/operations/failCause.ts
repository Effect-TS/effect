import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../../io/Cause"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * Creates a sink halting with a specified cause.
 *
 * @tsplus static ets/SinkOps failCause
 */
export function failCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): Sink<unknown, E, unknown, never, never> {
  return new SinkInternal(Channel.failCause(cause))
}
