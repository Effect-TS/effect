import type { List } from "../definition"

/**
 * Maps a function over a list and concatenates all the resulting
 * lists together.
 *
 * @tsplus fluent ets/List flatMap
 */
export function chain_<A, B>(self: List<A>, f: (a: A) => List<B>): List<B> {
  return self.map(f).flatten()
}

/**
 * Maps a function over a list and concatenates all the resulting
 * lists together.
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => List<B>) {
  return (self: List<A>): List<B> => self.flatMap(f)
}
