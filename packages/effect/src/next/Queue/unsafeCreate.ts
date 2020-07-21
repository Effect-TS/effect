import * as A from "../../Array"
import { chain_ } from "../Effect/chain_"
import { checkDescriptor } from "../Effect/checkDescriptor"
import { Async, AsyncRE, Sync } from "../Effect/effect"
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

import { Strategy } from "./strategy"
import { unsafeCompletePromise } from "./unsafeCompletePromise"
import { unsafeCompleteTakers } from "./unsafeCompleteTakers"
import { unsafeOfferAll } from "./unsafeOfferAll"
import { unsafePollAll } from "./unsafePollAll"
import { Queue, XQueue } from "./xqueue"

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

export const unsafeCreate = <A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Queue<A> =>
  new (class extends XQueue<unknown, unknown, never, never, A, A> {
    awaitShutdown: Async<void> = promiseWait(shutdownHook)

    capacity: number = queue.capacity

    isShutdown: Sync<boolean> = effectTotal(() => shutdownFlag.get)

    offer: (a: A) => AsyncRE<unknown, never, boolean> = (a) =>
      suspend(() => {
        if (shutdownFlag.get) {
          return interrupt
        } else {
          const taker = takers.poll(undefined)

          if (taker != null) {
            unsafeCompletePromise(taker, a)
            return succeedNow(true)
          } else {
            const succeeded = queue.offer(a)

            if (succeeded) {
              return succeedNow(true)
            } else {
              return strategy.handleSurplus([a], queue, takers, shutdownFlag)
            }
          }
        }
      })

    offerAll: (as: Iterable<A>) => AsyncRE<unknown, never, boolean> = (as) => {
      const arr = Array.from(as)
      return suspend(() => {
        if (shutdownFlag.get) {
          return interrupt
        } else {
          const pTakers = queue.isEmpty ? unsafePollN(takers, arr.length) : []
          const [forTakers, remaining] = A.splitAt(pTakers.length)(arr)

          A.zip_(pTakers, forTakers).forEach(([taker, item]) => {
            unsafeCompletePromise(taker, item)
          })

          if (remaining.length === 0) {
            return succeedNow(true)
          }

          const surplus = unsafeOfferAll(queue, remaining)

          unsafeCompleteTakers(strategy, queue, takers)

          if (surplus.length === 0) {
            return succeedNow(true)
          } else {
            return strategy.handleSurplus(surplus, queue, takers, shutdownFlag)
          }
        }
      })
    }

    shutdown: Async<void> = checkDescriptor((d) =>
      suspend(() => {
        shutdownFlag.set(true)

        return uninterruptible(
          whenM(promiseSucceed<void>(undefined)(shutdownHook))(
            chain_(
              foreachPar_(unsafePollAll(takers), promiseInterruptAs(d.id)),
              () => strategy.shutdown
            )
          )
        )
      })
    )

    size: Sync<number> = suspend(() => {
      if (shutdownFlag.get) {
        return interrupt
      } else {
        return succeedNow(queue.size - takers.size + strategy.surplusSize)
      }
    })

    take: AsyncRE<unknown, never, A> = checkDescriptor((d) =>
      suspend(() => {
        if (shutdownFlag.get) {
          return interrupt
        }

        const item = queue.poll(undefined)

        if (item != null) {
          strategy.unsafeOnQueueEmptySpace(queue)
          return succeedNow(item)
        } else {
          const p = promiseUnsafeMake<never, A>(d.id)

          return onInterrupt_(
            suspend(() => {
              takers.offer(p)
              unsafeCompleteTakers(strategy, queue, takers)
              if (shutdownFlag.get) {
                return interrupt
              } else {
                return promiseWait(p)
              }
            }),
            () => effectTotal(() => unsafeRemove(takers, p))
          )
        }
      })
    )

    takeAll: AsyncRE<unknown, never, readonly A[]> = suspend(() => {
      if (shutdownFlag.get) {
        return interrupt
      } else {
        return effectTotal(() => {
          const as = unsafePollAll(queue)
          strategy.unsafeOnQueueEmptySpace(queue)
          return as
        })
      }
    })

    takeUpTo: (n: number) => AsyncRE<unknown, never, readonly A[]> = (max) =>
      suspend(() => {
        if (shutdownFlag.get) {
          return interrupt
        } else {
          return effectTotal(() => {
            const as = unsafePollN(queue, max)
            strategy.unsafeOnQueueEmptySpace(queue)
            return as
          })
        }
      })
  })()
