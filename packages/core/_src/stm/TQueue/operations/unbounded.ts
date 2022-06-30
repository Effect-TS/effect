/**
 * Creates an unbounded queue.
 *
 * @tsplus static effect/core/stm/TQueue.Ops unbounded
 */
export function unbounded<A>(): USTM<TQueue<A>> {
  return TQueue.make(Number.MAX_SAFE_INTEGER, TQueue.Dropping)
}
