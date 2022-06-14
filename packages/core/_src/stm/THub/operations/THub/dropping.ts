/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * @tsplus static ets/THub/Ops dropping
 */
export function dropping<A>(
  requestedCapacity: number
): USTM<THub<A>> {
  return THub.make(requestedCapacity, THub.Dropping)
}
