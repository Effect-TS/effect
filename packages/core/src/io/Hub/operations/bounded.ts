import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Hub } from "../definition"
import { makeBounded } from "./_internal/makeBounded"
import { makeHub } from "./_internal/makeHub"
import { Strategy } from "./strategy"

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static ets/XHubOps bounded
 */
export function bounded<A>(
  requestedCapacity: number,
  __tsplusTrace?: string
): UIO<Hub<A>> {
  return Effect.succeed(makeBounded<A>(requestedCapacity)).flatMap((atomicHub) =>
    makeHub(atomicHub, Strategy.BackPressure())
  )
}
