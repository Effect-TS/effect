// ets_tracing: off

import * as H from "../../Hub/index.js"
import type * as T from "../_internal/effect.js"
import type * as Take from "../Take/index.js"
import type { Stream } from "./definitions.js"
import { into_ } from "./into.js"

/**
 * Publishes elements of this stream to a hub. Stream failure and ending will also be
 * signalled.
 */
export function intoHub<R, E, O, A>(
  self: Stream<R, E, O>,
  hub: H.XHub<R, never, never, unknown, Take.Take<E, O>, A>
): T.Effect<R, E, void> {
  return into_(self, H.toQueue(hub))
}
