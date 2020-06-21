import { checkDescriptor } from "../Effect/checkDescriptor"
import { Async } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { fiberId } from "../Effect/fiberId"
import { foreachPar_ } from "../Effect/foreachPar_"
import { Do } from "../Effect/instances"
import { interrupt } from "../Effect/interrupt"
import { onInterrupt_ } from "../Effect/onInterrupt_"
import { suspend } from "../Effect/suspend"
import { unit } from "../Effect/unit"
import { interruptAs as promiseInterruptAs } from "../Promise/interruptAs"
import { Promise } from "../Promise/promise"
import { unsafeMake as promiseUnsafeMake } from "../Promise/unsafeMake"
import { wait as promiseWait } from "../Promise/wait"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { MutableQueue, Unbounded } from "../Support/MutableQueue"

import { Strategy } from "./strategy"
import { unsafeCompletePromise } from "./unsafeCompletePromise"
import { unsafeCompleteTakers } from "./unsafeCompleteTakers"
import { unsafeOfferAll } from "./unsafeOfferAll"
import { unsafePollAll } from "./unsafePollAll"

export class BackPressureStrategy<A> implements Strategy<A> {
  private putters = new Unbounded<[A, Promise<never, boolean>, boolean]>()

  handleSurplus(
    as: readonly A[],
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean
  ): Async<boolean> {
    return checkDescriptor((d) =>
      suspend(() => {
        const p = promiseUnsafeMake<never, boolean>(d.id)

        return onInterrupt_(
          suspend(() => {
            this.unsafeOffer(as, p)
            this.unsafeOnQueueEmptySpace(queue)
            unsafeCompleteTakers(this, queue, takers)
            if (isShutdown.get) {
              return interrupt
            } else {
              return promiseWait(p)
            }
          }),
          () => effectTotal(() => this.unsafeRemove(p))
        )
      })
    )
  }

  unsafeRemove(p: Promise<never, boolean>) {
    unsafeOfferAll(
      this.putters,
      unsafePollAll(this.putters).filter(([_, __]) => __ !== p)
    )
  }

  unsafeOffer(as: readonly A[], p: Promise<never, boolean>) {
    const bs = Array.from(as)

    while (bs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const head = bs.shift()!

      if (bs.length === 0) {
        this.putters.offer([head, p, true])
      } else {
        this.putters.offer([head, p, false])
      }
    }
  }

  unsafeOnQueueEmptySpace(queue: MutableQueue<A>) {
    let keepPolling = true

    while (keepPolling && !queue.isFull) {
      const putter = this.putters.poll(undefined)

      if (putter != null) {
        const offered = queue.offer(putter[0])

        if (offered && putter[2]) {
          unsafeCompletePromise(putter[1], true)
        } else if (!offered) {
          unsafeOfferAll(this.putters, [putter, ...unsafePollAll(this.putters)])
        }
      } else {
        keepPolling = false
      }
    }
  }

  get shutdown(): Async<void> {
    return Do()
      .bind("fiberId", fiberId())
      .bind(
        "putters",
        effectTotal(() => unsafePollAll(this.putters))
      )
      .doL((s) =>
        foreachPar_(s.putters, ([_, p, lastItem]) =>
          lastItem ? promiseInterruptAs(s.fiberId)(p) : unit
        )
      )
      .unit()
  }

  get surplusSize(): number {
    return this.putters.size
  }
}
