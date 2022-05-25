/**
 * Takes a number of elements from the queue between the specified minimum and
 * maximum. If there are fewer than the minimum number of elements available,
 * suspends until at least the minimum number of elements have been collected.
 *
 * @tsplus fluent ets/Queue takeBetween
 */
export function takeBetween_<A>(
  self: Queue<A>,
  min: number,
  max: number
): Effect.UIO<Chunk<A>> {
  return Effect.suspendSucceed(takeRemainderLoop(self, min, max, Chunk.empty()))
}

/**
 * Takes a number of elements from the queue between the specified minimum and
 * maximum. If there are fewer than the minimum number of elements available,
 * suspends until at least the minimum number of elements have been collected.
 *
 * @tsplus static ets/Queue/Aspects takeBetween
 */
export const takeBetween = Pipeable(takeBetween_)

function takeRemainderLoop<A>(
  self: Queue<A>,
  min: number,
  max: number,
  acc: Chunk<A>,
  __tsplusTrace?: string
): Effect.UIO<Chunk<A>> {
  if (max < min) {
    return Effect.succeedNow(acc)
  }
  return self.takeUpTo(max).flatMap((bs) => {
    const remaining = min - bs.length

    if (remaining === 1) {
      return self.take.map((b) => (acc + bs).append(b))
    }

    if (remaining > 1) {
      return self.take.flatMap((b) =>
        takeRemainderLoop(
          self,
          remaining - 1,
          max - bs.length - 1,
          (acc + bs).append(b)
        )
      )
    }

    return Effect.succeedNow(acc + bs)
  })
}
