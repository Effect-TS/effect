import { identity } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * Terminates the stream when encountering the first `None`.
 *
 * @tsplus getter effect/core/stream/Stream collectWhileSome
 * @category mutations
 * @since 1.0.0
 */
export function collectWhileSome<R, E, L, A>(
  self: Stream<R, E, Option<A>>
): Stream<R, E, A> {
  return self.collectWhile(identity)
}
