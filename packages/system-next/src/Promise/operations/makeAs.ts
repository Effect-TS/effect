// ets_tracing: off

import type { UIO } from "../../Effect"
import { succeed } from "../../Effect/operations/succeed"
import type { FiberId } from "../../FiberId"
import type { Promise } from "../definition"
import { unsafeMake } from "./unsafeMake"

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export function makeAs<E, A>(fiberId: FiberId, __trace?: string): UIO<Promise<E, A>> {
  return succeed(() => unsafeMake(fiberId), __trace)
}
