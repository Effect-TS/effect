// ets_tracing: off

import { chain_ } from "../Effect/core.js"
import { fiberId } from "../Effect/fiberId.js"
import { makeAs } from "./makeAs.js"

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export function make<E, A>() {
  return chain_(fiberId, (id) => makeAs<E, A>(id))
}
