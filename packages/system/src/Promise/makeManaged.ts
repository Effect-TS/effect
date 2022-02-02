// ets_tracing: off

import { chain_ } from "../Effect/core.js"
import { fiberId } from "../Effect/fiberId.js"
import { toManaged } from "../Effect/index.js"
import { makeAs } from "./makeAs.js"

/**
 * Makes a new managed promise to be completed by the fiber creating the promise.
 */
export function makeManaged<E, A>() {
  return toManaged(chain_(fiberId, (id) => makeAs<E, A>(id)))
}
