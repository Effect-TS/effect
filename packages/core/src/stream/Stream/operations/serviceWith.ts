import type { Tag } from "@fp-ts/data/Context"

/**
 * Accesses the specified service in the environment of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops serviceWith
 * @category environment
 * @since 1.0.0
 */
export function serviceWith<T, A>(
  tag: Tag<T>,
  f: (resource: T) => A
): Stream<T, never, A> {
  return Stream.fromEffect(Effect.serviceWith(tag, f))
}
