// ets_tracing: off

import * as H from "../../Hub/index.js"
import type { Stream } from "./definitions.js"
import { ensuringFirst_ } from "./ensuringFirst.js"
import { fromHub } from "./fromHub.js"

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHubWithShutdown<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>
): Stream<R, E, A> {
  return ensuringFirst_(fromHub(hub), H.shutdown(hub))
}
