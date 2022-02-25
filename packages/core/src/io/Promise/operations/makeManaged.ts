import { Effect } from "../../Effect"
import type { Managed } from "../../Managed"
import { Promise } from "../definition"

/**
 * Makes a new managed promise to be completed by the fiber creating the
 * promise.
 *
 * @tsplus static ets/PromiseOps makeManaged
 */
export function makeManaged<E, A>(
  __tsplusTrace?: string
): Managed<unknown, never, Promise<E, A>> {
  return Effect.fiberId.flatMap((id) => Promise.makeAs<E, A>(id)).toManaged()
}
