import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink halting with a specified cause.
 *
 * @tsplus static effect/core/stream/Sink.Ops failCauseSync
 */
export function failCauseSync<E>(cause: LazyArg<Cause<E>>): Sink<never, E, unknown, never, never> {
  return new SinkInternal(Channel.failCauseSync(cause))
}
