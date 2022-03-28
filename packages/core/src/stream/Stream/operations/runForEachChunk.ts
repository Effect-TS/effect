import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../../io/Effect"
import { Sink } from "../../Sink"
import type { Stream } from "../../Stream"

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 *
 * @tsplus fluent ets/Stream runForEachChunk
 */
export function runForEachChunk_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (chunk: Chunk<A>) => Effect<R2, E2, Z>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, void> {
  return self.run(Sink.forEachChunk(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 */
export const runForEachChunk = Pipeable(runForEachChunk_)
