import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the environment of the stream in the context of a stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops environmentWithStream
 * @category environment
 * @since 1.0.0
 */
export function environmentWithStream<R0, R, E, A>(
  f: (context: Context<R0>) => Stream<R, E, A>
): Stream<R0 | R, E, A> {
  return Stream.environment<R0>().flatMap(f)
}
