/**
 * Take the head option of values in the queue.
 *
 * @tsplus fluent ets/Queue poll
 */
export function poll<A>(self: Queue<A>, __tsplusTrace?: string): Effect.UIO<Maybe<A>> {
  return self.takeUpTo(1).map((chunk) => chunk.head)
}
