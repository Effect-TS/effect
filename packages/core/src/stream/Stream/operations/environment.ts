import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the whole environment of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops environment
 * @category environment
 * @since 1.0.0
 */
export function environment<R>(): Stream<R, never, Context<R>> {
  return Stream.fromEffect(Effect.environment<R>())
}
