// ets_tracing: off

import { succeedWith } from "../Effect/core.js"
import type { FiberID } from "../Fiber/id.js"
import { unsafeMake } from "./unsafeMake.js"

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export function makeAs<E, A>(fiberId: FiberID) {
  return succeedWith(() => unsafeMake<E, A>(fiberId))
}
