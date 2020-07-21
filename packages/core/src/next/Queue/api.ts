import * as A from "../../Array"
import { pipe } from "../../Function"
import { chain } from "../Effect/chain"
import { chain_ } from "../Effect/chain_"
import { AsyncRE, Async, Sync } from "../Effect/effect"
import { foreach_ } from "../Effect/foreach_"
import { map_ } from "../Effect/map_"
import { repeat_ } from "../Effect/repeat"
import { succeedNow } from "../Effect/succeedNow"
import { zipPar_ } from "../Effect/zipPar_"
import { zipWithPar_ } from "../Effect/zipWithPar_"
import { both_ } from "../Schedule/both"
import { collectAll } from "../Schedule/collectAll"
import { map } from "../Schedule/map"
import { recurs } from "../Schedule/recurs"

import { XQueue } from "./xqueue"

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export const takeBetween = (min: number, max: number) => <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
): AsyncRE<RA & RB, unknown, readonly B[]> => {
  if (max < min) {
    return succeedNow([])
  } else {
    return pipe(
      self.takeUpTo(max),
      chain((bs) => {
        const remaining = min - bs.length

        if (remaining === 1) {
          return map_(self.take, (b) => [...bs, b])
        } else if (remaining > 1) {
          return pipe(
            both_(collectAll<B>(), recurs(remaining - 1)),
            map(([_]) => _),
            (s) => map_(repeat_(self.take, s), (a) => [...bs, ...a])
          )
        } else {
          return succeedNow(bs)
        }
      })
    )
  }
}

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export const takeBetween_ = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  min: number,
  max: number
): AsyncRE<RA & RB, unknown, readonly B[]> => takeBetween(min, max)(self)

/**
 * Waits until the queue is shutdown.
 * The `IO` returned by this method will not resume until the queue has been shutdown.
 * If the queue is already shutdown, the `IO` will resume right away.
 */
export const awaitShutdown = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => self.awaitShutdown

/**
 * How many elements can hold in the queue
 */
export const capacity = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.capacity

/**
 * `true` if `shutdown` has been called.
 */
export const isShutdown = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.isShutdown

/**
 * Places one value in the queue.
 */
export const offer = <A>(a: A) => <RA, RB, EA, EB, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => self.offer(a)

/**
 * Places one value in the queue.
 */
export const offer_ = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  a: A
) => self.offer(a)

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
 * If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room in
 * the queue.
 *
 * For Unbounded Queue:
 * Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy
 * If there is room in the queue, it places the values otherwise it removes the old elements and
 * enqueues the new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy,
 * It places the values in the queue but if there is no room it will not enqueue them and return false.
 *
 */
export const offerAll = <A>(as: Iterable<A>) => <RA, RB, EA, EB, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => self.offerAll(as)

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
 * If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room in
 * the queue.
 *
 * For Unbounded Queue:
 * Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy
 * If there is room in the queue, it places the values otherwise it removes the old elements and
 * enqueues the new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy,
 * It places the values in the queue but if there is no room it will not enqueue them and return false.
 *
 */
export const offerAll_ = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  as: Iterable<A>
) => self.offerAll(as)

/**
 * Interrupts any fibers that are suspended on `offer` or `take`.
 * Future calls to `offer*` and `take*` will be interrupted immediately.
 */
export const shutdown = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.shutdown

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 */
export const size = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.size

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 */
export const take = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.take

/**
 * Removes all the values in the queue and returns the list of the values. If the queue
 * is empty returns empty list.
 */
export const takeAll = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.takeAll

/**
 * Takes up to max number of values in the queue.
 */
export const takeAllUpTo = (n: number) => <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => self.takeUpTo(n)

/**
 * Takes up to max number of values in the queue.
 */
export const takeAllUpTo_ = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number
) => self.takeUpTo(n)

/**
 * Creates a new queue from this queue and another. Offering to the composite queue
 * will broadcast the elements to both queues; taking from the composite queue
 * will dequeue elements from both queues and apply the function point-wise.
 *
 * Note that using queues with different strategies may result in surprising behavior.
 * For example, a dropping queue and a bounded queue composed together may apply `f`
 * to different elements.
 */
export const bothWithM = <RA1, RB1, EA1, EB1, A1 extends A, C, B, R3, E3, D, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => AsyncRE<R3, E3, D>
) => <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) => bothWithM_(self, that, f)

/**
 * Creates a new queue from this queue and another. Offering to the composite queue
 * will broadcast the elements to both queues; taking from the composite queue
 * will dequeue elements from both queues and apply the function point-wise.
 *
 * Note that using queues with different strategies may result in surprising behavior.
 * For example, a dropping queue and a bounded queue composed together may apply `f`
 * to different elements.
 */
export const bothWithM_ = <
  RA,
  RB,
  EA,
  EB,
  RA1,
  RB1,
  EA1,
  EB1,
  A1 extends A,
  C,
  B,
  R3,
  E3,
  D,
  A
>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => AsyncRE<R3, E3, D>
) =>
  new (class extends XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
    awaitShutdown: Async<void> = chain_(self.awaitShutdown, () => that.awaitShutdown)

    capacity: number = Math.min(self.capacity, that.capacity)

    isShutdown: Sync<boolean> = self.isShutdown

    offer: (a: A1) => AsyncRE<RA & RA1, EA1 | EA, boolean> = (a) =>
      zipWithPar_(self.offer(a), that.offer(a), (x, y) => x && y)

    offerAll: (as: Iterable<A1>) => AsyncRE<RA & RA1, EA1 | EA, boolean> = (as) =>
      zipWithPar_(self.offerAll(as), that.offerAll(as), (x, y) => x && y)

    shutdown: Async<void> = zipWithPar_(self.shutdown, that.shutdown, () => undefined)

    size: Async<number> = zipWithPar_(self.size, that.size, (x, y) => Math.max(x, y))

    take: AsyncRE<RB & RB1 & R3, E3 | EB | EB1, D> = chain_(
      zipPar_(self.take, that.take),
      ([b, c]) => f(b, c)
    )

    takeAll: AsyncRE<RB & RB1 & R3, E3 | EB | EB1, readonly D[]> = chain_(
      zipPar_(self.takeAll, that.takeAll),
      ([bs, cs]) => {
        const abs = Array.from(bs)
        const acs = Array.from(cs)
        const all = A.zip_(abs, acs)

        return foreach_(all, ([b, c]) => f(b, c))
      }
    )

    takeUpTo: (n: number) => AsyncRE<RB & RB1 & R3, E3 | EB | EB1, readonly D[]> = (
      max
    ) =>
      chain_(zipPar_(self.takeUpTo(max), that.takeUpTo(max)), ([bs, cs]) => {
        const abs = Array.from(bs)
        const acs = Array.from(cs)
        const all = A.zip_(abs, acs)

        return foreach_(all, ([b, c]) => f(b, c))
      })
  })()
