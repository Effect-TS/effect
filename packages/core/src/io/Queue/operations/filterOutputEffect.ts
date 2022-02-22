import { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue, XQueueInternal } from "../definition"

/**
 * Filters elements dequeued from the queue using the specified effectual
 * predicate.
 *
 * @tsplus fluent ets/Queue filterOutputEffect
 * @tsplus fluent ets/XQueue filterOutputEffect
 * @tsplus fluent ets/Dequeue filterOutputEffect
 * @tsplus fluent ets/XDequeue filterOutputEffect
 * @tsplus fluent ets/Enqueue filterOutputEffect
 * @tsplus fluent ets/XEnqueue filterOutputEffect
 */
export function filterOutputEffect_<RA, RB, RB1, EB1, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => Effect<RB1, EB1, boolean>
): XQueue<RA, RB & RB1, EA, EB | EB1, A, B> {
  concreteQueue(self)
  return new FilterOutputEffect(self, f)
}

/**
 * Filters elements dequeued from the queue using the specified effectual
 * predicate.
 *
 * @ets_data_first filterOutputEffect_
 */
export function filterOutputEffect<RB1, EB1, B>(
  f: (b: B) => Effect<RB1, EB1, boolean>
) {
  return <RA, RB, EA, EB, A>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA, RB & RB1, EA, EB | EB1, A, B> => filterOutputEffect_(self, f)
}

class FilterOutputEffect<RA, RB, RB1, EB1, EA, EB, A, B> extends XQueueInternal<
  RA,
  RB & RB1,
  EA,
  EB | EB1,
  A,
  B
> {
  constructor(
    readonly self: XQueueInternal<RA, RB, EA, EB, A, B>,
    readonly f: (b: B) => Effect<RB1, EB1, boolean>
  ) {
    super()
  }

  _awaitShutdown: UIO<void> = this.self._awaitShutdown

  _capacity: number = this.self._capacity

  _isShutdown: UIO<boolean> = this.self._isShutdown

  _offer(a: A): Effect<RA, EA, boolean> {
    return this.self._offer(a)
  }

  _offerAll(as: Iterable<A>): Effect<RA, EA, boolean> {
    return this.self._offerAll(as)
  }

  _shutdown: UIO<void> = this.self._shutdown

  _size: UIO<number> = this.self._size

  _take: Effect<RB & RB1, EB1 | EB, B> = this.self._take.flatMap((b) => {
    return this.f(b).flatMap((p) => {
      return p ? Effect.succeedNow(b) : this._take
    })
  })

  _takeAll: Effect<RB & RB1, EB | EB1, Chunk<B>> = this.self._takeAll.flatMap((bs) =>
    bs.filterEffect(this.f)
  )

  _loop(max: number, acc: Chunk<B>): Effect<RB & RB1, EB | EB1, Chunk<B>> {
    return this.self._takeUpTo(max).flatMap((bs) => {
      if (bs.isEmpty()) {
        return Effect.succeedNow(acc)
      }

      return bs.filterEffect(this.f).flatMap((filtered) => {
        const length = filtered.size

        return length === max
          ? Effect.succeedNow(acc + filtered)
          : this._loop(max - length, acc + filtered)
      })
    })
  }

  _takeUpTo(n: number): Effect<RB & RB1, EB | EB1, Chunk<B>> {
    return Effect.suspendSucceed(this._loop(n, Chunk.empty()))
  }
}
