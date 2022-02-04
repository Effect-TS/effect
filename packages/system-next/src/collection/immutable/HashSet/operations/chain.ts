import { HashSet } from "../definition"

/**
 * Chains over the values of the `HashSet` using the specified function.
 *
 * @tsplus fluent ets/HashSet flatMap
 */
export function chain_<A, B>(self: HashSet<A>, f: (a: A) => Iterable<B>): HashSet<B> {
  const set = HashSet<B>()
  return set.mutate((_) => {
    self.forEach((e) => {
      for (const a of f(e)) {
        if (!_.has(a)) {
          _.add(a)
        }
      }
    })
  })
}

/**
 * Chains over the values of the `HashSet` using the specified function.
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => Iterable<B>) {
  return (self: HashSet<A>): HashSet<B> => self.flatMap(f)
}
