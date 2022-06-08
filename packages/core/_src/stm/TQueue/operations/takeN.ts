/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it retries until they
 * become available.
 *
 * @tsplus fluent ets/TQueue takeN
 */
export function takeN_<A>(self: TQueue<A>, n: number): USTM<Chunk<A>> {
  return self.takeBetween(n, n)
}

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it retries until they
 * become available.
 *
 * @tsplus static ets/TQueue/Aspects takeN
 */
export const takeN = Pipeable(takeN_)
