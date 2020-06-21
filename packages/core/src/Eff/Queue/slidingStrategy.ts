import { Async } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { unit } from "../Effect/unit"
import { Promise } from "../Promise/promise"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { MutableQueue } from "../Support/MutableQueue"

import { Strategy } from "./strategy"
import { unsafeCompleteTakers } from "./unsafeCompleteTakers"

export class SlidingStrategy<A> implements Strategy<A> {
  handleSurplus(
    as: readonly A[],
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    _isShutdown: AtomicBoolean
  ): Async<boolean> {
    return effectTotal(() => {
      this.unsafeSlidingOffer(queue, as)
      unsafeCompleteTakers(this, queue, takers)
      return true
    })
  }

  unsafeOnQueueEmptySpace(_queue: MutableQueue<A>) {
    //
  }

  get shutdown(): Async<void> {
    return unit
  }

  get surplusSize(): number {
    return 0
  }

  private unsafeSlidingOffer(queue: MutableQueue<A>, as: readonly A[]) {
    const bs = Array.from(as)

    while (bs.length > 0) {
      if (queue.capacity === 0) {
        return
      }
      // poll 1 and retry
      queue.poll(undefined)

      if (queue.offer(bs[0])) {
        bs.shift()
      }
    }
  }
}
