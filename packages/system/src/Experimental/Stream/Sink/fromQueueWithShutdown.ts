// ets_tracing: off

import * as T from "../../../Effect/index.js"
import * as M from "../../../Managed/index.js"
import * as Q from "../../../Queue/index.js"
import type * as C from "./core.js"
import * as FromQueue from "./fromQueue.js"
import * as UnwrapManaged from "./unwrapManaged.js"

/**
 * Create a sink which enqueues each element into the specified queue.
 */
export function fromQueueWithShutdown<R, InErr, E, I>(
  queue: Q.XQueue<R, never, E, unknown, I, void>
): C.Sink<R, InErr, I, InErr | E, unknown, void> {
  return UnwrapManaged.unwrapManaged(
    M.map_(M.make_(T.succeed(queue), Q.shutdown), (_) =>
      FromQueue.fromQueue<R, InErr, E, I>(_)
    )
  )
}
