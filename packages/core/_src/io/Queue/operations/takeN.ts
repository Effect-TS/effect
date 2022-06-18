/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it suspends until they
 * become available.
 *
 * @tsplus fluent ets/Queue takeN
 */
export function takeN_<A>(
  self: Queue<A>,
  n: number,
  __tsplusTrace?: string
): Effect<never, never, Chunk<A>> {
  return self.takeBetween(n, n)
}

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it suspends until they
 * become available.
 *
 * @tsplus static ets/Queue/Aspects takeN
 */
export const takeN = Pipeable(takeN_)
