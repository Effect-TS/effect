import type { Tag } from "@fp-ts/data/Context"

/**
 * Accesses the specified service in the environment of the channel in the
 * context of an effect.
 *
 * @tsplus static effect/core/stream/Channel.Ops serviceWithEffect
 * @category environment
 * @since 1.0.0
 */
export function serviceWithEffect<T, Env, OutErr, OutDone>(
  tag: Tag<T>,
  f: (resource: T) => Effect<Env, OutErr, OutDone>
): Channel<Env | T, unknown, unknown, unknown, OutErr, never, OutDone> {
  return Channel.service(tag).mapEffect(f)
}
