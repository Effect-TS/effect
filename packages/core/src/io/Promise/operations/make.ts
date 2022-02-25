import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { Promise } from "../definition"

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 *
 * @tsplus static ets/PromiseOps make
 */
export function make<E, A>(__tsplusTrace?: string): UIO<Promise<E, A>> {
  return Effect.fiberId.flatMap((id) => Promise.makeAs(id))
}
