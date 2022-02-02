// ets_tracing: off

import * as H from "../../../Hub/index.js"
import type * as C from "./core.js"
import * as FromQueueWithShutdown from "./fromQueueWithShutdown.js"

/**
 * Create a sink which enqueues each element into the specified queue.
 */
export function fromHubWithShutdown<R, InErr, E, I>(
  hub: H.XHub<R, never, E, unknown, I, any>
): C.Sink<R, InErr, I, InErr | E, unknown, void> {
  return FromQueueWithShutdown.fromQueueWithShutdown<R, InErr, E, I>(H.toQueue(hub))
}
