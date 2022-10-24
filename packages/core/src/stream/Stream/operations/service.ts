import type { Tag } from "@fp-ts/data/Context"
import { identity } from "@fp-ts/data/Function"

/**
 * Accesses the specified service in the environment of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops service
 * @category environment
 * @since 1.0.0
 */
export function service<T>(tag: Tag<T>): Stream<T, never, T> {
  return Stream.serviceWith(tag, identity)
}
