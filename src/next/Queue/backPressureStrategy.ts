import { pipe } from "../../Function"
import { interruptAs as promiseInterruptAs } from "../Promise/interruptAs"
import { Promise } from "../Promise/promise"
import { unsafeMake as promiseUnsafeMake } from "../Promise/unsafeMake"
import { wait as promiseWait } from "../Promise/wait"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { MutableQueue, Unbounded } from "../Support/MutableQueue"

import * as T from "./effect"
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
  ): T.Async<boolean> {
    return T.checkDescriptor((d) =>
      T.suspend(() => {
        const p = promiseUnsafeMake<never, boolean>(d.id)

        return T.onInterrupt_(
          T.suspend(() => {
            this.unsafeOffer(as, p)
            this.unsafeOnQueueEmptySpace(queue)
            unsafeCompleteTakers(this, queue, takers)
            if (isShutdown.get) {
              return T.interrupt
            } else {
              return promiseWait(p)
            }
          }),
          () => T.effectTotal(() => this.unsafeRemove(p))
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

  get shutdown(): T.Async<void> {
    return pipe(
      T.of,
      T.bind("fiberId", () => T.fiberId()),
      T.bind("putters", () => T.effectTotal(() => unsafePollAll(this.putters))),
      T.tap((s) =>
        T.foreachPar_(s.putters, ([_, p, lastItem]) =>
          lastItem ? promiseInterruptAs(s.fiberId)(p) : T.unit
        )
      ),
      T.asUnit
    )
  }

  get surplusSize(): number {
    return this.putters.size
  }
}
