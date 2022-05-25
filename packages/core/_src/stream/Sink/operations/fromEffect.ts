import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a single-value sink produced from an effect.
 *
 * @tsplus static ets/Sink/Ops fromEffect
 */
export function fromEffect<R, E, Z>(
  effect: LazyArg<Effect<R, E, Z>>,
  __tsplusTrace?: string
): Sink<R, E, unknown, unknown, Z> {
  return new SinkInternal(Channel.fromEffect(effect))
}
