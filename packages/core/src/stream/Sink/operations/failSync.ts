import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * A sink that always fails with the specified error.
 *
 * @tsplus static effect/core/stream/Sink.Ops failSync
 */
export function failSync<E>(e: LazyArg<E>): Sink<never, E, unknown, never, never> {
  return new SinkInternal(Channel.failSync(e))
}
