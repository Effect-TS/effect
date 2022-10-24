import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the whole environment of the channel.
 *
 * @tsplus static effect/core/stream/Channel.Ops environment
 * @category environment
 * @since 1.0.0
 */
export function environment<R>(): Channel<R, unknown, unknown, unknown, never, never, Context<R>> {
  return Channel.fromEffect(Effect.environment<R>())
}
