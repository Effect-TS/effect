import { HashSet } from "../definition"

/**
 * Maps over the values of the `HashSet` using the specified function.
 *
 * @tsplus fluent ets/HashSet map
 */
export function map_<A, B>(self: HashSet<A>, f: (a: A) => B): HashSet<B> {
  const set = HashSet<B>()
  return set.mutate((_) => {
    self.forEach((e) => {
      const v = f(e)
      if (!_.has(v)) {
        _.add(v)
      }
    })
  })
}

/**
 * Maps over the values of the `HashSet` using the specified function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: HashSet<A>): HashSet<B> => self.map(f)
}
