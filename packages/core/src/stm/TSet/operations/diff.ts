/**
 * Atomically transforms the set into the difference of itself and the
 * provided set.
 *
 * @tsplus static effect/core/stm/TSet.Aspects diff
 * @tsplus pipeable effect/core/stm/TSet diff
 */
export function diff<A>(other: TSet<A>) {
  return (self: TSet<A>): STM<never, never, void> =>
    other.toHashSet.flatMap(vals => self.removeIfDiscard((_) => vals.has(_)))
}
