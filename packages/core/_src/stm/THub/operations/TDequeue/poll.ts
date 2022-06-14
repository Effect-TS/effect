/**
 * Takes a single element from the queue, returning `None` if the queue is
 * empty.
 *
 * @tsplus getter ets/THub/TDequeue poll
 */
export function poll<A>(self: THub.TDequeue<A>): USTM<Option<A>> {
  return self.takeUpTo(1).map((_) => _.head)
}
