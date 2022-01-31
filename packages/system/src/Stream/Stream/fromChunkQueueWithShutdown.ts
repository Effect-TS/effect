// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Q from "../../Queue/index.js"
import type { Stream } from "./definitions.js"
import { ensuringFirst_ } from "./ensuringFirst.js"
import { fromChunkQueue } from "./fromChunkQueue.js"

/**
 * Creates a stream from a {@link XQueue} of values. The queue will be shutdown once the stream is closed.
 */
export function fromChunkQueueWithShutdown<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, A.Chunk<O>>
): Stream<R, E, O> {
  return ensuringFirst_(fromChunkQueue(queue), Q.shutdown(queue))
}
