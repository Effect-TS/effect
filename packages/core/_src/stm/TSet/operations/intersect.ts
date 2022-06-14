/**
 * Removes elements from the set.
 *
 * @tsplus fluent ets/TSet intersect
 */
export function intersect_<A>(self: TSet<A>, other: TSet<A>): USTM<void> {
  return other.toHashSet.flatMap(vals => self.retainIfDiscard((_) => vals.has(_)))
}

/**
 * Removes elements from the set.
 *
 * @tsplus static ets/TSet/Aspects intersect
 */
export const intersect = Pipeable(intersect_)
