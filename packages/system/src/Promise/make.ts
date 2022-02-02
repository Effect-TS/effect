// ets_tracing: off

import { chain_ } from "../Effect/core"
import { fiberId } from "../Effect/fiberId"
import { makeAs } from "./makeAs"

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export function make<E, A>() {
  return chain_(fiberId, (id) => makeAs<E, A>(id))
}
