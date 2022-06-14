/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 *
 * @tsplus getter ets/Cause interruptors
 */
export function interruptors<E>(self: Cause<E>): HashSet<FiberId> {
  return self.foldLeft(
    HashSet.empty<FiberId>(),
    (acc, curr) => curr.isInterruptType() ? Option.some(acc.add(curr.fiberId)) : Option.some(acc)
  )
}
