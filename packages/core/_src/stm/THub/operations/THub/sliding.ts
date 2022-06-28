/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @tsplus static effect/core/stm/THub.Ops sliding
 */
export function sliding<A>(requestedCapacity: number): STM<never, never, THub<A>> {
  return THub.make(requestedCapacity, THub.Sliding)
}
