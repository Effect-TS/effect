import { makeBounded } from "@effect/core/io/Hub/operations/_internal/makeBounded"
import { makeHub } from "@effect/core/io/Hub/operations/_internal/makeHub"
import { Strategy } from "@effect/core/io/Hub/operations/strategy"

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static ets/Hub/Ops dropping
 */
export function dropping<A>(
  requestedCapacity: number,
  __tsplusTrace?: string
): Effect.UIO<Hub<A>> {
  return Effect.succeed(makeBounded<A>(requestedCapacity)).flatMap((atomicHub) =>
    makeHub(atomicHub, Strategy.Dropping())
  )
}
