import type { Tag } from "@fp-ts/data/Context"

/**
 * Accesses the specified service in the environment of the channel.
 *
 * @tsplus static effect/core/stream/Channel.Ops service
 * @category environment
 * @since 1.0.0
 */
export function service<T>(tag: Tag<T>): Channel<T, unknown, unknown, unknown, never, never, T> {
  return Channel.fromEffect(Effect.service(tag))
}
