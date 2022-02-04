import type { Predicate, Refinement } from "../../../../data/Function"
import type { Next } from "../../Map"
import { Tuple } from "../../Tuple"
import { HashSet } from "../definition"

/**
 * Partition the values of a `HashSet` using the specified predicate.
 *
 * If a value matches the predicate, it will be placed into the `HashSet` on the
 * right side of the resulting `Tuple`, otherwise the value will be placed into
 * the left side.
 *
 * @tsplus fluent ets/HashSet partition
 */
export function partition_<A, B extends A>(
  self: HashSet<A>,
  f: Refinement<A, B>
): Tuple<[HashSet<A>, HashSet<B>]>
export function partition_<A>(
  self: HashSet<A>,
  f: Predicate<A>
): Tuple<[HashSet<A>, HashSet<A>]>
export function partition_<A>(
  self: HashSet<A>,
  f: Predicate<A>
): Tuple<[HashSet<A>, HashSet<A>]> {
  const vs = self.values()
  let e: Next<A>
  const right = HashSet<A>().beginMutation()
  const left = HashSet<A>().beginMutation()
  while (!(e = vs.next()).done) {
    const value = e.value
    if (f(value)) {
      right.add(value)
    } else {
      left.add(value)
    }
  }
  return Tuple(left.endMutation(), right.endMutation())
}

/**
 * Partition the values of a `HashSet` using the specified predicate.
 *
 * If a value matches the predicate, it will be placed into the `HashSet` on the
 * right side of the resulting `Tuple`, otherwise the value will be placed into
 * the left side.
 *
 * @ets_data_first partition_
 */
export function partition<A, B extends A>(
  f: Refinement<A, B>
): (self: HashSet<A>) => Tuple<[HashSet<A>, HashSet<B>]>
export function partition<A>(
  f: Predicate<A>
): (self: HashSet<A>) => Tuple<[HashSet<A>, HashSet<A>]>
export function partition<A>(f: Predicate<A>) {
  return (self: HashSet<A>): Tuple<[HashSet<A>, HashSet<A>]> => self.partition(f)
}
