/**
 * Removes elements from the set.
 *
 * @tsplus static effect/core/stm/TSet.Aspects intersect
 * @tsplus pipeable effect/core/stm/TSet intersect
 */
export function intersect<A>(other: TSet<A>) {
  return (self: TSet<A>): STM<never, never, void> =>
    other.toHashSet.flatMap(vals => self.retainIfDiscard((_) => vals.has(_)))
}
