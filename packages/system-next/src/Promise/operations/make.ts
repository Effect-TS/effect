// ets_tracing: off

import type { UIO } from "../../Effect"
import { chain_ } from "../../Effect/operations/chain"
import { fiberId } from "../../Effect/operations/fiberId"
import type { Promise } from "../definition"
import { makeAs } from "./makeAs"

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export function make<E, A>(__trace?: string): UIO<Promise<E, A>> {
  return chain_(fiberId, (_) => makeAs(_), __trace)
}
