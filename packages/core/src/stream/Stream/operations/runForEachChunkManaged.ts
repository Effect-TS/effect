import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../../io/Effect"
import type { Managed } from "../../../io/Managed"
import { Sink } from "../../Sink"
import type { Stream } from "../definition"

/**
 * Like `Stream.runForeachChunk`, but returns a `Managed` so the
 * finalization order can be controlled.
 *
 * @tsplus fluent ets/Stream runForEachChunkManaged
 */
export function runForEachChunkManaged_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (chunk: Chunk<A>) => Effect<R2, E2, Z>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, void> {
  return self.runManaged(Sink.forEachChunk(f))
}

/**
 * Like `Stream.runForeachChunk`, but returns a `Managed` so the
 * finalization order can be controlled.
 */
export const runForEachChunkManaged = Pipeable(runForEachChunkManaged_)
