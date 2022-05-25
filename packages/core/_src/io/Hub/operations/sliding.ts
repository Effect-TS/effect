import { makeBounded } from "@effect/core/io/Hub/operations/_internal/makeBounded"
import { makeHub } from "@effect/core/io/Hub/operations/_internal/makeHub"
import { Strategy } from "@effect/core/io/Hub/operations/strategy"

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static ets/Hub/Ops sliding
 */
export function sliding<A>(
  requestedCapacity: number,
  __tsplusTrace?: string
): Effect.UIO<Hub<A>> {
  return Effect.succeed(makeBounded<A>(requestedCapacity)).flatMap((atomicHub) =>
    makeHub(atomicHub, Strategy.Sliding())
  )
}
