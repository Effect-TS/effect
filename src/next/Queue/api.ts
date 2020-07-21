import * as A from "../../Array"
import { pipe, tuple } from "../../Function"

import * as T from "./effect"
import * as S from "./schedule"
import { XQueue } from "./xqueue"

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export const takeBetween = (min: number, max: number) => <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
): T.AsyncRE<RA & RB, EB, readonly B[]> => {
  if (max < min) {
    return T.succeedNow([])
  } else {
    return pipe(
      self.takeUpTo(max),
      T.chain((bs) => {
        const remaining = min - bs.length

        if (remaining === 1) {
          return T.map_(self.take, (b) => [...bs, b])
        } else if (remaining > 1) {
          return pipe(
            S.collectAll<B>(),
            S.both(S.recurs(remaining - 1)),
            S.map(([_]) => _),
            S.repeat(self.take),
            T.map((a) => [...bs, ...a])
          )
        } else {
          return T.succeedNow(bs)
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
): T.AsyncRE<RA & RB, EB, readonly B[]> => takeBetween(min, max)(self)

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
  f: (b: B, c: C) => T.AsyncRE<R3, E3, D>
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
  f: (b: B, c: C) => T.AsyncRE<R3, E3, D>
): XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> =>
  new (class extends XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
    awaitShutdown: T.Async<void> = T.chain_(
      self.awaitShutdown,
      () => that.awaitShutdown
    )

    capacity: number = Math.min(self.capacity, that.capacity)

    isShutdown: T.Sync<boolean> = self.isShutdown

    offer: (a: A1) => T.AsyncRE<RA & RA1, EA1 | EA, boolean> = (a) =>
      T.zipWithPar_(self.offer(a), that.offer(a), (x, y) => x && y)

    offerAll: (as: Iterable<A1>) => T.AsyncRE<RA & RA1, EA1 | EA, boolean> = (as) =>
      T.zipWithPar_(self.offerAll(as), that.offerAll(as), (x, y) => x && y)

    shutdown: T.Async<void> = T.zipWithPar_(
      self.shutdown,
      that.shutdown,
      () => undefined
    )

    size: T.Async<number> = T.zipWithPar_(self.size, that.size, (x, y) =>
      Math.max(x, y)
    )

    take: T.AsyncRE<RB & RB1 & R3, E3 | EB | EB1, D> = T.chain_(
      T.zipPar_(self.take, that.take),
      ([b, c]) => f(b, c)
    )

    takeAll: T.AsyncRE<RB & RB1 & R3, E3 | EB | EB1, readonly D[]> = T.chain_(
      T.zipPar_(self.takeAll, that.takeAll),
      ([bs, cs]) => {
        const abs = Array.from(bs)
        const acs = Array.from(cs)
        const all = A.zip_(abs, acs)

        return T.foreach_(all, ([b, c]) => f(b, c))
      }
    )

    takeUpTo: (n: number) => T.AsyncRE<RB & RB1 & R3, E3 | EB | EB1, readonly D[]> = (
      max
    ) =>
      T.chain_(T.zipPar_(self.takeUpTo(max), that.takeUpTo(max)), ([bs, cs]) => {
        const abs = Array.from(bs)
        const acs = Array.from(cs)
        const all = A.zip_(abs, acs)

        return T.foreach_(all, ([b, c]) => f(b, c))
      })
  })()

/**
 * Like `bothWithM`, but uses a pure function.
 */
export const bothWith = <RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
) => <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  bothWithM_(self, that, (b, c) => T.succeedNow(f(b, c)))

/**
 * Like `bothWithM`, but uses a pure function.
 */
export const bothWith_ = <RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
) => bothWithM_(self, that, (b, c) => T.succeedNow(f(b, c)))

/**
 * Like `bothWith`, but tuples the elements instead of applying a function.
 */
export const both = <RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>
) => <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  bothWith_(self, that, (b, c) => tuple(b, c))

/**
 * Like `bothWith`, but tuples the elements instead of applying a function.
 */
export const both_ = <RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>
) => bothWith_(self, that, (b, c) => tuple(b, c))

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export const dimapM = <A, B, C, RC, EC, RD, ED, D>(
  f: (c: C) => T.AsyncRE<RC, EC, A>,
  g: (b: B) => T.AsyncRE<RD, ED, D>
) => <RA, RB, EA, EB>(
  self: XQueue<RA, RB, EA, EB, A, B>
): XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> => dimapM_(self, f, g)

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export const dimapM_ = <RA, RB, EA, EB, A, B, C, RC, EC, RD, ED, D>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.AsyncRE<RC, EC, A>,
  g: (b: B) => T.AsyncRE<RD, ED, D>
): XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> =>
  new (class extends XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
    awaitShutdown: T.Async<void> = self.awaitShutdown

    capacity: number = self.capacity

    isShutdown: T.Sync<boolean> = self.isShutdown

    offer: (a: C) => T.AsyncRE<RC & RA, EA | EC, boolean> = (c) =>
      T.chain_(f(c), self.offer)

    offerAll: (as: Iterable<C>) => T.AsyncRE<RC & RA, EC | EA, boolean> = (cs) =>
      T.chain_(T.foreach_(cs, f), self.offerAll)

    shutdown: T.Async<void> = self.shutdown

    size: T.Async<number> = self.size

    take: T.AsyncRE<RD & RB, ED | EB, D> = T.chain_(self.take, g)

    takeAll: T.AsyncRE<RD & RB, ED | EB, readonly D[]> = T.chain_(self.takeAll, (a) =>
      T.foreach_(a, g)
    )

    takeUpTo: (n: number) => T.AsyncRE<RD & RB, ED | EB, readonly D[]> = (max) =>
      T.chain_(self.takeUpTo(max), (bs) => T.foreach_(bs, g))
  })()
