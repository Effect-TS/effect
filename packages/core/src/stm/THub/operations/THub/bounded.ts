/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * @tsplus static effect/core/stm/THub.Ops bounded
 * @category constructors
 * @since 1.0.0
 */
export function bounded<A>(
  requestedCapacity: number
): USTM<THub<A>> {
  return THub.make(requestedCapacity, THub.BackPressure)
}
