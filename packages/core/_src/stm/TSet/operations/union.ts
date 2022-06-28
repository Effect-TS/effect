/**
 * Atomically transforms the set into the union of itself and the provided
 * set.
 *
 * @tsplus static effect/core/stm/TSet.Aspects union
 * @tsplus pipeable effect/core/stm/TSet union
 */
export function union<A>(other: TSet<A>) {
  return (self: TSet<A>): STM<never, never, void> => other.forEach((_) => self.put(_))
}
