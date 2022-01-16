// ets_tracing: off

import { chain_ } from "../../Effect/operations/chain"
import { fiberId } from "../../Effect/operations/fiberId"
import { toManaged } from "../../Effect/operations/toManaged"
import type { Managed } from "../../Managed"
import type { Promise } from "../definition"
import { makeAs } from "./makeAs"

/**
 * Makes a new managed promise to be completed by the fiber creating the promise.
 */
export function makeManaged<E, A>(): Managed<unknown, never, Promise<E, A>> {
  return toManaged(chain_(fiberId, (id) => makeAs<E, A>(id)))
}
