import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * A sink that immediately ends with the specified value.
 *
 * @tsplus static ets/SinkOps succeed
 */
export function succeed<Z>(
  z: LazyArg<Z>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, never, Z> {
  return new SinkInternal(Channel.succeed(z))
}
