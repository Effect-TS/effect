/**
 * Makes a new `TPriorityQueue` that is initialized with specified values.
 *
 * @tsplus static ets/TPriorityQueue/Ops make
 */
export function make<A>(ord: Ord<A>) {
  return (...data: Array<A>): USTM<TPriorityQueue<A>> => TPriorityQueue.from(ord)(data)
}
