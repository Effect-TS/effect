// ets_tracing: off

import * as H from "../../Hub/index.js"
import { chain_ } from "./chain.js"
import type { Stream } from "./definitions.js"
import { fromQueue } from "./fromQueue.js"
import { managed } from "./managed.js"

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHub<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>
): Stream<R, E, A> {
  return chain_(managed(H.subscribe(hub)), (queue) => fromQueue(queue))
}
