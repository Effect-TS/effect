import { Chunk } from "../../../collection/immutable/Chunk"
import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Takes a number of elements from the queue between the specified minimum and
 * maximum. If there are fewer than the minimum number of elements available,
 * suspends until at least the minimum number of elements have been collected.
 *
 * @tsplus fluent ets/Queue takeBetween
 * @tsplus fluent ets/XQueue takeBetween
 * @tsplus fluent ets/Dequeue takeBetween
 * @tsplus fluent ets/XDequeue takeBetween
 * @tsplus fluent ets/Enqueue takeBetween
 * @tsplus fluent ets/XEnqueue takeBetween
 */
export function takeBetween_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  min: number,
  max: number
): Effect<RB, EB, Chunk<B>> {
  return Effect.suspendSucceed(takeRemainderLoop(self, min, max, Chunk.empty()))
}

/**
 * Takes a number of elements from the queue between the specified minimum and
 * maximum. If there are fewer than the minimum number of elements available,
 * suspends until at least the minimum number of elements have been collected.
 *
 * @ets_data_first takeBetween_
 */
export function takeBetween(min: number, max: number, __tsplusTrace?: string) {
  return <RA, RB, EA, EB, A, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): Effect<RB, EB, Chunk<B>> => self.takeBetween(min, max)
}

function takeRemainderLoop<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  min: number,
  max: number,
  acc: Chunk<B>,
  __tsplusTrace?: string
): Effect<RB, EB, Chunk<B>> {
  if (max < min) {
    return Effect.succeedNow(acc)
  }
  return self.takeUpTo(max).flatMap((bs) => {
    const remaining = min - bs.length

    if (remaining === 1) {
      return self.take().map((b) => (acc + bs).append(b))
    }

    if (remaining > 1) {
      return self
        .take()
        .flatMap((b) =>
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
