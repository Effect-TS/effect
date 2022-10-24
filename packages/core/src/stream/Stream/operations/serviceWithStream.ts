import type { Tag } from "@fp-ts/data/Context"

/**
 * Accesses the specified service in the environment of the stream in the
 * context of a stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops serviceWithStream
 * @category environment
 * @since 1.0.0
 */
export function serviceWithStream<T, R, E, A>(
  tag: Tag<T>,
  f: (resource: T) => Stream<R, E, A>
): Stream<R | T, E, A> {
  return Stream.service(tag).flatMap(f)
}
