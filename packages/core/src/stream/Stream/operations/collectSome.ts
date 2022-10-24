import { identity } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * Filters any 'None' values.
 *
 * @tsplus getter effect/core/stream/Stream collectSome
 * @category mutations
 * @since 1.0.0
 */
export function collectSome<R, E, A>(self: Stream<R, E, Option<A>>): Stream<R, E, A> {
  return self.collect(identity)
}
