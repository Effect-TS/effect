/**
 * Removes elements from the set.
 *
 * @tsplus fluent ets/TSet diff
 */
export function diff_<A>(self: TSet<A>, other: TSet<A>): USTM<void> {
  return other.toHashSet.flatMap(vals => self.removeIfDiscard((_) => vals.has(_)))
}

/**
 * Removes elements from the set.
 *
 * @tsplus static ets/TSet/Aspects diff
 */
export const diff = Pipeable(diff_)
