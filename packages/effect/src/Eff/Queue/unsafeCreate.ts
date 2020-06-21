import * as A from "../../Array"
import { chain_ } from "../Effect/chain_"
import { checkDescriptor } from "../Effect/checkDescriptor"
import { Async, Sync } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { foreachPar_ } from "../Effect/foreachPar_"
import { interrupt } from "../Effect/interrupt"
import { onInterrupt_ } from "../Effect/onInterrupt_"
import { succeedNow } from "../Effect/succeedNow"
import { suspend } from "../Effect/suspend"
import { uninterruptible } from "../Effect/uninterruptible"
import { whenM } from "../Effect/whenM"
import { interruptAs as promiseInterruptAs } from "../Promise/interruptAs"
import { Promise } from "../Promise/promise"
import { succeed as promiseSucceed } from "../Promise/succeed"
import { unsafeMake as promiseUnsafeMake } from "../Promise/unsafeMake"
import { wait as promiseWait } from "../Promise/wait"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { MutableQueue } from "../Support/MutableQueue"

import { Queue } from "./queue"
import { Strategy } from "./strategy"
import { unsafeCompletePromise } from "./unsafeCompletePromise"
import { unsafeCompleteTakers } from "./unsafeCompleteTakers"
import { unsafeOfferAll } from "./unsafeOfferAll"
import { unsafePollAll } from "./unsafePollAll"

export const unsafeRemove = <A>(q: MutableQueue<A>, a: A) => {
  unsafeOfferAll(q, unsafePollAll(q)).filter((b) => a !== b)
}

export const unsafePollN = <A>(q: MutableQueue<A>, max: number): readonly A[] => {
  let j = 0
  const as = [] as A[]

  while (j < max) {
    const p = q.poll(undefined)

    if (p != null) {
      as.push(p)
    } else {
      return as
    }

    j += 1
  }

  return as
}

class UnsafeCreate<A> implements Queue<A> {
  constructor(
    private queue: MutableQueue<A>,
    private takers: MutableQueue<Promise<never, A>>,
    private shutdownHook: Promise<never, void>,
    private shutdownFlag: AtomicBoolean,
    private strategy: Strategy<A>
  ) {
    this.offer = this.offer.bind(this)
    this.offerAll = this.offerAll.bind(this)
    this.removeTaker = this.removeTaker.bind(this)
    this.takeUpTo = this.takeUpTo.bind(this)
  }

  get waitShutdown(): Async<void> {
    return promiseWait(this.shutdownHook)
  }

  get size(): Async<number> {
    return suspend(() => {
      if (this.shutdownFlag.get) {
        return interrupt
      } else {
        return succeedNow(
          this.queue.size - this.takers.size + this.strategy.surplusSize
        )
      }
    })
  }

  get capacity(): number {
    return this.queue.capacity
  }

  get take(): Async<A> {
    return checkDescriptor((d) =>
      suspend(() => {
        if (this.shutdownFlag.get) {
          return interrupt
        }

        const item = this.queue.poll(undefined)

        if (item != null) {
          this.strategy.unsafeOnQueueEmptySpace(this.queue)
          return succeedNow(item)
        } else {
          const p = promiseUnsafeMake<never, A>(d.id)

          return onInterrupt_(
            suspend(() => {
              this.takers.offer(p)
              unsafeCompleteTakers(this.strategy, this.queue, this.takers)
              if (this.shutdownFlag.get) {
                return interrupt
              } else {
                return promiseWait(p)
              }
            }),
            () => this.removeTaker(p)
          )
        }
      })
    )
  }

  get takeAll(): Sync<readonly A[]> {
    return suspend(() => {
      if (this.shutdownFlag.get) {
        return interrupt
      } else {
        return effectTotal(() => {
          const as = unsafePollAll(this.queue)
          this.strategy.unsafeOnQueueEmptySpace(this.queue)
          return as
        })
      }
    })
  }

  takeUpTo(max: number): Sync<readonly A[]> {
    return suspend(() => {
      if (this.shutdownFlag.get) {
        return interrupt
      } else {
        return effectTotal(() => {
          const as = unsafePollN(this.queue, max)
          this.strategy.unsafeOnQueueEmptySpace(this.queue)
          return as
        })
      }
    })
  }

  get shutdown(): Async<void> {
    return checkDescriptor((d) =>
      suspend(() => {
        this.shutdownFlag.set(true)

        return uninterruptible(
          whenM(promiseSucceed<void>(undefined)(this.shutdownHook))(
            chain_(
              foreachPar_(unsafePollAll(this.takers), promiseInterruptAs(d.id)),
              () => this.strategy.shutdown
            )
          )
        )
      })
    )
  }

  get isShutdown(): Sync<boolean> {
    return effectTotal(() => this.shutdownFlag.get)
  }

  removeTaker(taker: Promise<never, A>) {
    return effectTotal(() => unsafeRemove(this.takers, taker))
  }

  offerAll(as: Iterable<A>): Async<boolean> {
    const arr = Array.from(as)
    return suspend(() => {
      if (this.shutdownFlag.get) {
        return interrupt
      } else {
        const pTakers = this.queue.isEmpty ? unsafePollN(this.takers, arr.length) : []
        const [forTakers, remaining] = A.splitAt(pTakers.length)(arr)

        A.zip_(pTakers, forTakers).forEach(([taker, item]) => {
          unsafeCompletePromise(taker, item)
        })

        if (remaining.length === 0) {
          return succeedNow(true)
        }

        const surplus = unsafeOfferAll(this.queue, remaining)

        unsafeCompleteTakers(this.strategy, this.queue, this.takers)

        if (surplus.length === 0) {
          return succeedNow(true)
        } else {
          return this.strategy.handleSurplus(
            surplus,
            this.queue,
            this.takers,
            this.shutdownFlag
          )
        }
      }
    })
  }

  offer(a: A) {
    return suspend(() => {
      if (this.shutdownFlag.get) {
        return interrupt
      } else {
        const taker = this.takers.poll(undefined)

        if (taker != null) {
          unsafeCompletePromise(taker, a)
          return succeedNow(true)
        } else {
          const succeeded = this.queue.offer(a)

          if (succeeded) {
            return succeedNow(true)
          } else {
            return this.strategy.handleSurplus(
              [a],
              this.queue,
              this.takers,
              this.shutdownFlag
            )
          }
        }
      }
    })
  }
}

export const unsafeCreate = <A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Queue<A> => new UnsafeCreate(queue, takers, shutdownHook, shutdownFlag, strategy)
