/**
 * Takes a single element from the queue, returning `None` if the queue is
 * empty.
 *
 * @tsplus getter effect/core/stm/TQueue poll
 */
export function poll<A>(self: TQueue<A>): USTM<Maybe<A>> {
  return self.takeUpTo(1).map((_) => _.head)
}
