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
  if (max < min) {
    return Effect.succeedNow(Chunk.empty())
  }

  return self.takeUpTo(max).flatMap((bs) => {
    const remaining = min - bs.size

    if (remaining === 1) {
      return self.take().map((b) => bs.append(b))
    } else if (remaining > 1) {
      return takeRemainderLoop(self, remaining).map((list) => bs + list)
    } else {
      return Effect.succeedNow(bs)
    }
  })
}

/**
 * Takes a number of elements from the queue between the specified minimum and
 * maximum. If there are fewer than the minimum number of elements available,
 * suspends until at least the minimum number of elements have been collected.
 *
 * @ets_data_first takeBetween_
 */
export function takeBetween(min: number, max: number, __etsTrace?: string) {
  return <RA, RB, EA, EB, A, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): Effect<RB, EB, Chunk<B>> => self.takeBetween(min, max)
}

function takeRemainderLoop<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number,
  __etsTrace?: string
): Effect<RB, EB, Chunk<B>> {
  return n <= 0
    ? Effect.succeedNow(Chunk.empty())
    : self
        .take()
        .flatMap((a) => takeRemainderLoop(self, n - 1).map((chunk) => chunk.append(a)))
}
