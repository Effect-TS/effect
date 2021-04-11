// tracing: off

import * as A from "../Collections/Immutable/Array"
import * as Chunk from "../Collections/Immutable/Chunk"
import { succeed } from "../Effect/core"
import * as exclForEach from "../Effect/excl-forEach"
import {
  BackPressureStrategy,
  createQueue,
  makeBoundedQueue as makeBounded,
  unsafeCreateQueue as unsafeCreate
} from "../Effect/excl-forEach"
import { identity, pipe, tuple } from "../Function"
import * as O from "../Option"
import { Bounded, Unbounded } from "../Support/MutableQueue"
import { DroppingStrategy, SlidingStrategy } from "./core"
import * as T from "./effect-api"
import type { Queue } from "./xqueue"
import { XQueue } from "./xqueue"

export { createQueue, makeBounded, unsafeCreate, BackPressureStrategy }

/**
 * Creates a sliding queue
 */
export function makeSliding<A>(capacity: number): T.UIO<Queue<A>> {
  return T.chain_(
    T.effectTotal(() => new Bounded<A>(capacity)),
    exclForEach.createQueue(new SlidingStrategy())
  )
}

/**
 * Creates a unbouded queue
 */
export function makeUnbounded<A>(): T.UIO<Queue<A>> {
  return T.chain_(
    T.effectTotal(() => new Unbounded<A>()),
    exclForEach.createQueue(new DroppingStrategy())
  )
}

/**
 * Creates a dropping queue
 */
export function makeDropping<A>(capacity: number): T.UIO<Queue<A>> {
  return T.chain_(
    T.effectTotal(() => new Bounded<A>(capacity)),
    exclForEach.createQueue(new DroppingStrategy())
  )
}

function takeRamainderLoop<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number
): T.Effect<RB, EB, Chunk.Chunk<B>> {
  if (n <= 0) {
    return T.succeed(Chunk.empty())
  } else {
    return T.chain_(self.take, (a) =>
      T.map_(takeRamainderLoop(self, n - 1), (_) => Chunk.append_(_, a))
    )
  }
}

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export function takeBetween(min: number, max: number) {
  return <RA, RB, EA, EB, A, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): T.Effect<RB, EB, Chunk.Chunk<B>> => {
    if (max < min) {
      return T.succeed(Chunk.empty())
    } else {
      return pipe(
        self.takeUpTo(max),
        T.chain((bs) => {
          const remaining = min - Chunk.size(bs)

          if (remaining === 1) {
            return T.map_(self.take, (b) => Chunk.append_(bs, b))
          } else if (remaining > 1) {
            return T.map_(takeRamainderLoop(self, remaining), (list) =>
              Chunk.concat_(bs, list)
            )
          } else {
            return T.succeed(bs)
          }
        })
      )
    }
  }
}

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export function takeBetween_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  min: number,
  max: number
): T.Effect<RB, EB, Chunk.Chunk<B>> {
  return takeBetween(min, max)(self)
}

/**
 * Waits until the queue is shutdown.
 * The `IO` returned by this method will not resume until the queue has been shutdown.
 * If the queue is already shutdown, the `IO` will resume right away.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) {
  return self.awaitShutdown
}

/**
 * How many elements can hold in the queue
 */
export function capacity<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.capacity
}

/**
 * `true` if `shutdown` has been called.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.isShutdown
}

/**
 * Places one value in the queue.
 */
export function offer<A>(a: A) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => self.offer(a)
}

/**
 * Places one value in the queue.
 */
export function offer_<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>, a: A) {
  return self.offer(a)
}

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
 */
export function offerAll<A>(as: Iterable<A>) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => self.offerAll(as)
}

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
 */
export function offerAll_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  as: Iterable<A>
) {
  return self.offerAll(as)
}

/**
 * Interrupts any fibers that are suspended on `offer` or `take`.
 * Future calls to `offer*` and `take*` will be interrupted immediately.
 */
export function shutdown<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.shutdown
}

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 */
export function size<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.size
}

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 */
export function take<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.take
}

/**
 * Removes all the values in the queue and returns the list of the values. If the queue
 * is empty returns empty list.
 */
export function takeAll<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return self.takeAll
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo(n: number) {
  return <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) => self.takeUpTo(n)
}

/**
 * Takes up to max number of values in the queue.
 */
export function takeAllUpTo_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number
) {
  return self.takeUpTo(n)
}

/**
 * Creates a new queue from this queue and another. Offering to the composite queue
 * will broadcast the elements to both queues; taking from the composite queue
 * will dequeue elements from both queues and apply the function point-wise.
 *
 * Note that using queues with different strategies may result in surprising behavior.
 * For example, a dropping queue and a bounded queue composed together may apply `f`
 * to different elements.
 */
export function bothWithM<RA1, RB1, EA1, EB1, A1 extends A, C, B, R3, E3, D, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => T.Effect<R3, E3, D>
) {
  return <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    bothWithM_(self, that, f)
}

/**
 * Creates a new queue from this queue and another. Offering to the composite queue
 * will broadcast the elements to both queues; taking from the composite queue
 * will dequeue elements from both queues and apply the function point-wise.
 *
 * Note that using queues with different strategies may result in surprising behavior.
 * For example, a dropping queue and a bounded queue composed together may apply `f`
 * to different elements.
 */
export function bothWithM_<
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
  f: (b: B, c: C) => T.Effect<R3, E3, D>
): XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
  return new (class extends XQueue<
    RA & RA1,
    RB & RB1 & R3,
    EA | EA1,
    E3 | EB | EB1,
    A1,
    D
  > {
    awaitShutdown: T.UIO<void> = T.chain_(self.awaitShutdown, () => that.awaitShutdown)

    capacity: number = Math.min(self.capacity, that.capacity)

    isShutdown: T.UIO<boolean> = self.isShutdown

    offer: (a: A1) => T.Effect<RA & RA1, EA1 | EA, boolean> = (a) =>
      T.zipWithPar_(self.offer(a), that.offer(a), (x, y) => x && y)

    offerAll: (as: Iterable<A1>) => T.Effect<RA & RA1, EA1 | EA, boolean> = (as) =>
      T.zipWithPar_(self.offerAll(as), that.offerAll(as), (x, y) => x && y)

    shutdown: T.UIO<void> = T.zipWithPar_(self.shutdown, that.shutdown, () => undefined)

    size: T.UIO<number> = T.zipWithPar_(self.size, that.size, (x, y) => Math.max(x, y))

    take: T.Effect<RB & RB1 & R3, E3 | EB | EB1, D> = T.chain_(
      T.zipPar_(self.take, that.take),
      ([b, c]) => f(b, c)
    )

    takeAll: T.Effect<
      RB & RB1 & R3,
      E3 | EB | EB1,
      Chunk.Chunk<D>
    > = T.chain_(T.zipPar_(self.takeAll, that.takeAll), ([bs, cs]) =>
      Chunk.mapM_(Chunk.zip_(bs, cs), ([b, c]) => f(b, c))
    )

    takeUpTo: (n: number) => T.Effect<RB & RB1 & R3, E3 | EB | EB1, Chunk.Chunk<D>> = (
      max
    ) =>
      T.chain_(T.zipPar_(self.takeUpTo(max), that.takeUpTo(max)), ([bs, cs]) =>
        Chunk.mapM_(Chunk.zip_(bs, cs), ([b, c]) => f(b, c))
      )
  })()
}

/**
 * Like `bothWithM`, but uses a pure function.
 */
export function bothWith<RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
) {
  return <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    bothWithM_(self, that, (b, c) => T.succeed(f(b, c)))
}

/**
 * Like `bothWithM`, but uses a pure function.
 */
export function bothWith_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
) {
  return bothWithM_(self, that, (b, c) => T.succeed(f(b, c)))
}

/**
 * Like `bothWith`, but tuples the elements instead of applying a function.
 */
export function both<RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>
) {
  return <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    bothWith_(self, that, (b, c) => tuple(b, c))
}

/**
 * Like `bothWith`, but tuples the elements instead of applying a function.
 */
export function both_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>
) {
  return bothWith_(self, that, (b, c) => tuple(b, c))
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimap<A, B, C, D>(f: (c: C) => A, g: (b: B) => D) {
  return <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    dimapM_(
      self,
      (c: C) => succeed(f(c)),
      (b) => succeed(g(b))
    )
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
) {
  return dimapM_(
    self,
    (c: C) => succeed(f(c)),
    (b) => succeed(g(b))
  )
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimapM<A, B, C, RC, EC, RD, ED, D>(
  f: (c: C) => T.Effect<RC, EC, A>,
  g: (b: B) => T.Effect<RD, ED, D>
) {
  return <RA, RB, EA, EB>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> => dimapM_(self, f, g)
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified effectual functions.
 */
export function dimapM_<RA, RB, EA, EB, A, B, C, RC, EC, RD, ED, D>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Effect<RC, EC, A>,
  g: (b: B) => T.Effect<RD, ED, D>
): XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
  return new (class extends XQueue<RC & RA, RD & RB, EC | EA, ED | EB, C, D> {
    awaitShutdown: T.UIO<void> = self.awaitShutdown

    capacity: number = self.capacity

    isShutdown: T.UIO<boolean> = self.isShutdown

    offer: (a: C) => T.Effect<RC & RA, EA | EC, boolean> = (c) =>
      T.chain_(f(c), self.offer)

    offerAll: (as: Iterable<C>) => T.Effect<RC & RA, EC | EA, boolean> = (cs) =>
      T.chain_(T.forEach_(cs, f), self.offerAll)

    shutdown: T.UIO<void> = self.shutdown

    size: T.UIO<number> = self.size

    take: T.Effect<RD & RB, ED | EB, D> = T.chain_(self.take, g)

    takeAll: T.Effect<RD & RB, ED | EB, Chunk.Chunk<D>> = T.chain_(self.takeAll, (a) =>
      Chunk.mapM_(a, g)
    )

    takeUpTo: (n: number) => T.Effect<RD & RB, ED | EB, Chunk.Chunk<D>> = (max) =>
      T.chain_(self.takeUpTo(max), (bs) => Chunk.mapM_(bs, g))
  })()
}

/**
 * Transforms elements enqueued into this queue with an effectful function.
 */
export function contramapM<C, RA2, EA2, A>(f: (c: C) => T.Effect<RA2, EA2, A>) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    dimapM_(self, f, succeed)
}

/**
 * Transforms elements enqueued into this queue with a pure function.
 */
export function contramap<C, A>(f: (c: C) => A) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    dimapM_(self, (c: C) => succeed(f(c)), succeed)
}

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 */
export function filterInputM<A, A1 extends A, R2, E2>(
  f: (_: A1) => T.Effect<R2, E2, boolean>
) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA & R2, RB, EA | E2, EB, A1, B> => filterInputM_(self, f)
}

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 */
export const filterInputM_ = <RA, RB, EA, EB, B, A, A1 extends A, R2, E2>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (_: A1) => T.Effect<R2, E2, boolean>
): XQueue<RA & R2, RB, EA | E2, EB, A1, B> =>
  new (class extends XQueue<RA & R2, RB, EA | E2, EB, A1, B> {
    awaitShutdown: T.UIO<void> = self.awaitShutdown

    capacity: number = self.capacity

    isShutdown: T.UIO<boolean> = self.isShutdown

    offer: (a: A1) => T.Effect<RA & R2, EA | E2, boolean> = (a) =>
      T.chain_(f(a), (b) => (b ? self.offer(a) : T.succeed(false)))

    offerAll: (as: Iterable<A1>) => T.Effect<RA & R2, EA | E2, boolean> = (as) =>
      pipe(
        as,
        T.forEach((a) =>
          pipe(
            f(a),
            T.map((b) => (b ? O.some(a) : O.none))
          )
        ),
        T.chain((maybeAs) => {
          const filtered = A.filterMap_(maybeAs, identity)

          if (A.isEmpty(filtered)) {
            return T.succeed(false)
          } else {
            return self.offerAll(filtered)
          }
        })
      )

    shutdown: T.UIO<void> = self.shutdown

    size: T.UIO<number> = self.size

    take: T.Effect<RB, EB, B> = self.take

    takeAll: T.Effect<RB, EB, Chunk.Chunk<B>> = self.takeAll

    takeUpTo: (n: number) => T.Effect<RB, EB, Chunk.Chunk<B>> = (max) =>
      self.takeUpTo(max)
  })()

/**
 * Filters elements dequeued from the queue using the specified effectual
 * predicate.
 */
export function filterOutputM_<RA, RB, RB1, EB1, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RB1, EB1, boolean>
): XQueue<RA, RB & RB1, EA, EB | EB1, A, B> {
  return new (class extends XQueue<RA, RB & RB1, EA, EB | EB1, A, B> {
    awaitShutdown: T.UIO<void> = self.awaitShutdown

    capacity: number = self.capacity

    isShutdown: T.UIO<boolean> = self.isShutdown

    offer: (a: A) => T.Effect<RA, EA, boolean> = (a) => self.offer(a)

    offerAll: (as: Iterable<A>) => T.Effect<RA, EA, boolean> = (as) => self.offerAll(as)

    shutdown: T.UIO<void> = self.shutdown

    size: T.UIO<number> = self.size

    take: T.Effect<RB & RB1, EB1 | EB, B> = T.chain_(self.take, (b) => {
      return T.chain_(f(b), (p) => {
        return p ? T.succeed(b) : this.take
      })
    })

    takeAll: T.Effect<RB & RB1, EB | EB1, Chunk.Chunk<B>> = T.chain_(
      self.takeAll,
      (bs) => Chunk.filterM_(bs, f)
    )

    loop(
      max: number,
      acc: Chunk.Chunk<B>
    ): T.Effect<RB & RB1, EB | EB1, Chunk.Chunk<B>> {
      return T.chain_(self.takeUpTo(max), (bs) => {
        if (Chunk.isEmpty(bs)) {
          return T.succeed(acc)
        }

        return T.chain_(Chunk.filterM_(bs, f), (filtered) => {
          const length = Chunk.size(filtered)

          if (length === max) {
            return T.succeed(Chunk.concat_(acc, filtered))
          } else {
            return this.loop(max - length, Chunk.concat_(acc, filtered))
          }
        })
      })
    }

    takeUpTo: (n: number) => T.Effect<RB & RB1, EB | EB1, Chunk.Chunk<B>> = (max) =>
      T.suspend(() => {
        return this.loop(max, Chunk.empty())
      })
  })()
}

/**
 * Filters elements dequeued from the queue using the specified effectual
 * predicate.
 */
export function filterOutputM<RB1, EB1, B>(f: (b: B) => T.Effect<RB1, EB1, boolean>) {
  return <RA, RB, EA, EB, A>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    filterOutputM_(self, f)
}

/**
 * Filters elements dequeued from the queue using the specified predicate.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): XQueue<RA, RB, EA, EB, A, B> {
  return filterOutputM_(self, (b) => T.succeed(f(b)))
}

/**
 * Filters elements dequeued from the queue using the specified predicate.
 */
export function filterOutput<B>(f: (b: B) => boolean) {
  return <RA, RB, EA, EB, A>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    filterOutput_(self, f)
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 */
export function filterInput<A, A1 extends A>(f: (_: A1) => boolean) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA, RB, EA, EB, A1, B> => filterInputM_(self, (a) => T.succeed(f(a)))
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (_: A1) => boolean
): XQueue<RA, RB, EA, EB, A1, B> {
  return filterInputM_(self, (a) => T.succeed(f(a)))
}

/**
 * Transforms elements dequeued from this queue with a function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): XQueue<RA, RB, EA, EB, A, C> {
  return mapM_(self, (_) => T.succeed(f(_)))
}

/**
 * Transforms elements dequeued from this queue with a function.
 */
export function map<RA, RB, EA, EB, A, B, C>(f: (b: B) => C) {
  return (self: XQueue<RA, RB, EA, EB, A, B>) => map_(self, f)
}

/**
 * Transforms elements dequeued from this queue with an effectful function.
 */
export function mapM<B, R2, E2, C>(f: (b: B) => T.Effect<R2, E2, C>) {
  return <RA, RB, EA, EB, A>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    dimapM_(self, (a: A) => T.succeed(a), f)
}

/**
 * Transforms elements dequeued from this queue with an effectful function.
 */
export function mapM_<RA, RB, EA, EB, A, B, R2, E2, C>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<R2, E2, C>
) {
  return dimapM_(self, (a: A) => T.succeed(a), f)
}

/**
 * Take the head option of values in the queue.
 */
export function poll<RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) {
  return T.map_(self.takeUpTo(1), (x) => Chunk.unsafeGet_(x, 0))
}
