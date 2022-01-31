// ets_tracing: off

import * as Q from "../../Queue/index.js"
import type { Stream } from "./definitions.js"
import { ensuringFirst_ } from "./ensuringFirst.js"
import { fromQueue } from "./fromQueue.js"

/**
 * Creates a stream from a {@link XQueue} of values. The queue will be shutdown once the stream is closed.
 */
export function fromQueueWithShutdown<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, O>
): Stream<R, E, O> {
  return ensuringFirst_(fromQueue(queue), Q.shutdown(queue))
}
