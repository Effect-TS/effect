import { Async } from "../Effect/effect"
import { Promise } from "../Promise/promise"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { MutableQueue } from "../Support/MutableQueue"

export interface Strategy<A> {
  readonly handleSurplus: (
    as: readonly A[],
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean
  ) => Async<boolean>

  readonly unsafeOnQueueEmptySpace: (queue: MutableQueue<A>) => void

  readonly surplusSize: number

  readonly shutdown: Async<void>
}
