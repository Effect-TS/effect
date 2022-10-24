import type { Tag } from "@fp-ts/data/Context"

/**
 * Accesses the specified service in the environment of the stream in the
 * context of an effect.
 *
 * @tsplus static effect/core/stream/Stream.Ops serviceWithEffect
 * @category environment
 * @since 1.0.0
 */
export function serviceWithEffect<T, R, E, A>(
  tag: Tag<T>,
  f: (resource: T) => Effect<R, E, A>
): Stream<R | T, E, A> {
  return Stream.fromEffect(Effect.serviceWithEffect(tag, f))
}
