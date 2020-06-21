import { Async } from "../Effect/effect"
import { succeedNow } from "../Effect/succeedNow"
import { unit } from "../Effect/unit"
import { Promise } from "../Promise/promise"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { MutableQueue } from "../Support/MutableQueue"

import { Strategy } from "./strategy"

export class DroppingStrategy<A> implements Strategy<A> {
  handleSurplus(
    _as: readonly A[],
    _queue: MutableQueue<A>,
    _takers: MutableQueue<Promise<never, A>>,
    _isShutdown: AtomicBoolean
  ): Async<boolean> {
    return succeedNow(false)
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
}
