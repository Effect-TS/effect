import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a single-value sink produced from an effect.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromEffect
 * @category conversions
 * @since 1.0.0
 */
export function fromEffect<R, E, Z>(
  effect: Effect<R, E, Z>
): Sink<R, E, unknown, unknown, Z> {
  return new SinkInternal(Channel.fromEffect(effect))
}
