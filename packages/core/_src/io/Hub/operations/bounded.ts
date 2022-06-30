import { makeBounded } from "@effect/core/io/Hub/operations/_internal/makeBounded"
import { makeHub } from "@effect/core/io/Hub/operations/_internal/makeHub"
import { Strategy } from "@effect/core/io/Hub/operations/strategy"

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static effect/core/io/Hub.Ops bounded
 */
export function bounded<A>(
  requestedCapacity: number,
  __tsplusTrace?: string
): Effect<never, never, Hub<A>> {
  return Effect.succeed(makeBounded<A>(requestedCapacity)).flatMap((atomicHub) =>
    makeHub(atomicHub, Strategy.BackPressure())
  )
}
