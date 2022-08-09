/**
 * Makes a new `TPriorityQueue` that is initialized with specified values.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Ops make
 */
export function make<A>(ord: Ord<A>) {
  return (...data: Array<A>): STM<never, never, TPriorityQueue<A>> =>
    TPriorityQueue.fromIterable(ord)(data)
}
