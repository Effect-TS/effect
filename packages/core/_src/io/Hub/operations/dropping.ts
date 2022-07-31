import { makeBounded } from "@effect/core/io/Hub/operations/_internal/makeBounded"
import { makeHub } from "@effect/core/io/Hub/operations/_internal/makeHub"
import { Strategy } from "@effect/core/io/Hub/operations/strategy"

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static effect/core/io/Hub.Ops dropping
 */
export function dropping<A>(requestedCapacity: number): Effect<never, never, Hub<A>> {
  return Effect.sync(makeBounded<A>(requestedCapacity)).flatMap((atomicHub) =>
    makeHub(atomicHub, Strategy.Dropping())
  )
}
