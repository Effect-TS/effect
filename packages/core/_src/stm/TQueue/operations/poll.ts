/**
 * Takes a single element from the queue, returning `None` if the queue is
 * empty.
 *
 * @tsplus getter ets/TQueue poll
 */
export function poll<A>(self: TQueue<A>): USTM<Option<A>> {
  return self.takeUpTo(1).map((_) => _.head)
}
