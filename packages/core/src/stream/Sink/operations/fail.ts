import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * A sink that always fails with the specified error.
 *
 * @tsplus static ets/SinkOps fail
 */
export function fail<E>(
  e: LazyArg<E>,
  __tsplusTrace?: string
): Sink<unknown, E, unknown, never, never> {
  return new SinkInternal(Channel.fail(e))
}
