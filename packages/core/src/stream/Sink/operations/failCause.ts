import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink halting with a specified cause.
 *
 * @tsplus static effect/core/stream/Sink.Ops failCause
 * @category constructors
 * @since 1.0.0
 */
export function failCause<E>(cause: Cause<E>): Sink<never, E, unknown, never, never> {
  return new SinkInternal(Channel.failCause(cause))
}
