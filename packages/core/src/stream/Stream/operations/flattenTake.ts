import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream
 * by failing with `None`.
 *
 * @tsplus getter effect/core/stream/Stream flattenTake
 * @category sequencing
 * @since 1.0.0
 */
export function flattenTake<R, E, E2, A>(
  self: Stream<R, E, Take<E2, A>>
): Stream<R, E | E2, A> {
  return (self
    .map((take) => take.exit as Exit<Option<E | E2>, A>)
    .flattenExitOption as Stream<R, E | E2, Chunk<A>>)
    .unchunks
}
