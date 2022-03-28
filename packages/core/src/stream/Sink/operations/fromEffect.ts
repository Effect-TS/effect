import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * Creates a single-value sink produced from an effect.
 *
 * @tsplus static ets/SinkOps fromEffect
 */
export function fromEffect<R, E, Z>(
  effect: LazyArg<Effect<R, E, Z>>,
  __tsplusTrace?: string
): Sink<R, E, unknown, unknown, Z> {
  return new SinkInternal(Channel.fromEffect(effect))
}
