import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Transforms `Take<E, A>` to an `Effect<never, Maybe<E>, Chunk<A>>`.
 *
 * @tsplus getter effect/core/stream/Take done
 * @category constructors
 * @since 1.0.0
 */
export function done<E, A>(
  self: Take<E, A>
): Effect<never, Option<E>, Chunk<A>> {
  concreteTake(self)
  return Effect.done(self._exit)
}
