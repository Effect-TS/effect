/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it retries until they
 * become available.
 *
 * @tsplus fluent ets/THub/TDequeue takeN
 */
export function takeN_<A>(self: THub.TDequeue<A>, n: number): USTM<Chunk<A>> {
  return self.takeBetween(n, n)
}

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it retries until they
 * become available.
 *
 * @tsplus static ets/THub/TDequeue/Aspects takeN
 */
export const takeN = Pipeable(takeN_)
