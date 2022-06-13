/**
 * Atomically transforms the set into the union of itself and the provided
 * set.
 *
 * @tsplus fluent ets/TSet union
 */
export function union_<A>(self: TSet<A>, other: TSet<A>): USTM<void> {
  return other.foreach((_) => self.put(_))
}

/**
 * Atomically transforms the set into the union of itself and the provided
 * set.
 *
 * @tsplus static ets/TSet/Aspects union
 */
export const union = Pipeable(union_)
