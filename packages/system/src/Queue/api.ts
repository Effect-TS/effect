// ets_tracing: off

import { collect_ } from "../Collections/Immutable/Chunk/api/collect.js"
import { filterEffect_ } from "../Collections/Immutable/Chunk/api/filterEffect.js"
import { mapEffect_ } from "../Collections/Immutable/Chunk/api/mapEffect.js"
import { zip_ } from "../Collections/Immutable/Chunk/api/zip.js"
import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import { succeed } from "../Effect/core.js"
import * as exclForEach from "../Effect/excl-forEach.js"
import {
  BackPressureStrategy,
  createQueue,
  makeBoundedQueue as makeBounded,
  unsafeCreateQueue as unsafeCreate
} from "../Effect/excl-forEach.js"
import { identity, pipe, tuple } from "../Function/index.js"
import * as O from "../Option/index.js"
import { Bounded, Unbounded } from "../Support/MutableQueue/index.js"
import { DroppingStrategy, SlidingStrategy } from "./core.js"
import * as T from "./effect-api.js"
import type { Queue, XQueue } from "./xqueue.js"
import { concreteQueue, XQueueInternal } from "./xqueue.js"

export { createQueue, makeBounded, unsafeCreate, BackPressureStrategy }

/**
 * Creates a sliding queue
 */
export function makeSliding<A>(capacity: number): T.UIO<Queue<A>> {
  return T.chain_(
    T.succeedWith(() => new Bounded<A>(capacity)),
    exclForEach.createQueue(new SlidingStrategy())
  )
}

/**
 * Creates a unbouded queue
 */
export function makeUnbounded<A>(): T.UIO<Queue<A>> {
  return T.chain_(
    T.succeedWith(() => new Unbounded<A>()),
    exclForEach.createQueue(new DroppingStrategy())
  )
}

/**
 * Creates a dropping queue
 */
export function makeDropping<A>(capacity: number): T.UIO<Queue<A>> {
  return T.chain_(
    T.succeedWith(() => new Bounded<A>(capacity)),
    exclForEach.createQueue(new DroppingStrategy())
  )
}

function takeRemainderLoop<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number
): T.Effect<RB, EB, Chunk.Chunk<B>> {
  concreteQueue(self)
  if (n <= 0) {
    return T.succeed(Chunk.empty())
  } else {
    return T.chain_(self.take, (a) =>
      T.map_(takeRemainderLoop(self, n - 1), (_) => Chunk.append_(_, a))
    )
  }
}

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 *
 * @ets_data_first takeBetween_
 */
export function takeBetween(min: number, max: number) {
  return <RA, RB, EA, EB, A, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): T.Effect<RB, EB, Chunk.Chunk<B>> => takeBetween_(self, min, max)
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
  concreteQueue(self)
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
          return T.map_(takeRemainderLoop(self, remaining), (list) =>
            Chunk.concat_(bs, list)
          )
        } else {
          return T.succeed(bs)
        }
      })
    )
  }
}

/**
 * Creates a new queue from this queue and another. Offering to the composite queue
 * will broadcast the elements to both queues; taking from the composite queue
 * will dequeue elements from both queues and apply the function point-wise.
 *
 * Note that using queues with different strategies may result in surprising behavior.
 * For example, a dropping queue and a bounded queue composed together may apply `f`
 * to different elements.
 *
 * @ets_data_first bothWithM_
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
  concreteQueue(self)
  concreteQueue(that)
  return new BothWithM(self, that, f)
}

class BothWithM<
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
> extends XQueueInternal<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
  constructor(
    readonly self: XQueueInternal<RA, RB, EA, EB, A, B>,
    readonly that: XQueueInternal<RA1, RB1, EA1, EB1, A1, C>,
    readonly f: (b: B, c: C) => T.Effect<R3, E3, D>
  ) {
    super()
  }

  awaitShutdown: T.UIO<void> = T.chain_(
    this.self.awaitShutdown,
    () => this.that.awaitShutdown
  )

  capacity: number = Math.min(this.self.capacity, this.that.capacity)

  isShutdown: T.UIO<boolean> = this.self.isShutdown

  offer(a: A1): T.Effect<RA & RA1, EA1 | EA, boolean> {
    return T.zipWithPar_(this.self.offer(a), this.that.offer(a), (x, y) => x && y)
  }

  offerAll(as: Iterable<A1>): T.Effect<RA & RA1, EA1 | EA, boolean> {
    return T.zipWithPar_(
      this.self.offerAll(as),
      this.that.offerAll(as),
      (x, y) => x && y
    )
  }

  shutdown: T.UIO<void> = T.zipWithPar_(
    this.self.shutdown,
    this.that.shutdown,
    () => undefined
  )

  size: T.UIO<number> = T.zipWithPar_(this.self.size, this.that.size, (x, y) =>
    Math.max(x, y)
  )

  take: T.Effect<RB & RB1 & R3, E3 | EB | EB1, D> = T.chain_(
    T.zipPar_(this.self.take, this.that.take),
    ({ tuple: [b, c] }) => this.f(b, c)
  )

  takeAll: T.Effect<RB & RB1 & R3, E3 | EB | EB1, Chunk.Chunk<D>> = T.chain_(
    T.zipPar_(this.self.takeAll, this.that.takeAll),
    ({ tuple: [bs, cs] }) =>
      mapEffect_(zip_(bs, cs), ({ tuple: [b, c] }) => this.f(b, c))
  )

  takeUpTo(max: number): T.Effect<RB & RB1 & R3, E3 | EB | EB1, Chunk.Chunk<D>> {
    return T.chain_(
      T.zipPar_(this.self.takeUpTo(max), this.that.takeUpTo(max)),
      ({ tuple: [bs, cs] }) =>
        mapEffect_(zip_(bs, cs), ({ tuple: [b, c] }) => this.f(b, c))
    )
  }
}

/**
 * Like `bothWithM`, but uses a pure function.
 *
 * @ets_data_first bothWith_
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
 *
 * @ets_data_first both_
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
 *
 * @ets_data_first dimap_
 */
export function dimap<A, B, C, D>(f: (c: C) => A, g: (b: B) => D) {
  return <RA, RB, EA, EB>(self: XQueue<RA, RB, EA, EB, A, B>) => dimap_(self, f, g)
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
 *
 * @ets_data_first dimapM_
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
  concreteQueue(self)
  return new DimapM(self, f, g)
}

class DimapM<RA, RB, EA, EB, A, B, C, RC, EC, RD, ED, D> extends XQueueInternal<
  RC & RA,
  RD & RB,
  EC | EA,
  ED | EB,
  C,
  D
> {
  constructor(
    readonly self: XQueueInternal<RA, RB, EA, EB, A, B>,
    readonly f: (c: C) => T.Effect<RC, EC, A>,
    readonly g: (b: B) => T.Effect<RD, ED, D>
  ) {
    super()
  }

  awaitShutdown: T.UIO<void> = this.self.awaitShutdown

  capacity: number = this.self.capacity

  isShutdown: T.UIO<boolean> = this.self.isShutdown

  offer(a: C): T.Effect<RC & RA, EA | EC, boolean> {
    return T.chain_(this.f(a), (a) => this.self.offer(a))
  }

  offerAll(as: Iterable<C>): T.Effect<RC & RA, EC | EA, boolean> {
    return T.chain_(T.forEach_(as, this.f), (as) => this.self.offerAll(as))
  }

  shutdown: T.UIO<void> = this.self.shutdown

  size: T.UIO<number> = this.self.size

  take: T.Effect<RD & RB, ED | EB, D> = T.chain_(this.self.take, this.g)

  takeAll: T.Effect<RD & RB, ED | EB, Chunk.Chunk<D>> = T.chain_(
    this.self.takeAll,
    (a) => mapEffect_(a, this.g)
  )

  takeUpTo(n: number): T.Effect<RD & RB, ED | EB, Chunk.Chunk<D>> {
    return T.chain_(this.self.takeUpTo(n), (bs) => mapEffect_(bs, this.g))
  }
}

/**
 * Transforms elements enqueued into this queue with an effectful function.
 */
export function contramapM_<RA, RB, EA, EB, B, C, RA2, EA2, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Effect<RA2, EA2, A>
) {
  return dimapM_(self, f, succeed)
}

/**
 * Transforms elements enqueued into this queue with an effectful function.
 *
 * @ets_data_first contramapM_
 */
export function contramapM<C, RA2, EA2, A>(f: (c: C) => T.Effect<RA2, EA2, A>) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => contramapM_(self, f)
}

/**
 * Transforms elements enqueued into this queue with a pure function.
 */
export function contramap_<RA, RB, EA, EB, B, C, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
) {
  return dimapM_(self, (c: C) => succeed(f(c)), succeed)
}

/**
 * Transforms elements enqueued into this queue with a pure function.
 *
 * @ets_data_first contramap_
 */
export function contramap<C, A>(f: (c: C) => A) {
  return <RA, RB, EA, EB, B>(self: XQueue<RA, RB, EA, EB, A, B>) => contramap_(self, f)
}

/**
 * Like `filterInput`, but uses an effectful function to filter the elements.
 *
 * @ets_data_first filterInputM_
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
export function filterInputM_<RA, RB, EA, EB, B, A, A1 extends A, R2, E2>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (_: A1) => T.Effect<R2, E2, boolean>
): XQueue<RA & R2, RB, EA | E2, EB, A1, B> {
  concreteQueue(self)
  return new FilterInputM(self, f)
}

class FilterInputM<RA, RB, EA, EB, B, A, A1 extends A, R2, E2> extends XQueueInternal<
  RA & R2,
  RB,
  EA | E2,
  EB,
  A1,
  B
> {
  constructor(
    readonly self: XQueueInternal<RA, RB, EA, EB, A, B>,
    readonly f: (_: A1) => T.Effect<R2, E2, boolean>
  ) {
    super()
  }

  awaitShutdown: T.UIO<void> = this.self.awaitShutdown

  capacity: number = this.self.capacity

  isShutdown: T.UIO<boolean> = this.self.isShutdown

  offer(a: A1): T.Effect<RA & R2, EA | E2, boolean> {
    return T.chain_(this.f(a), (b) => (b ? this.self.offer(a) : T.succeed(false)))
  }

  offerAll(as: Iterable<A1>): T.Effect<RA & R2, EA | E2, boolean> {
    return pipe(
      as,
      T.forEach((a) =>
        pipe(
          this.f(a),
          T.map((b) => (b ? O.some(a) : O.none))
        )
      ),
      T.chain((maybeAs) => {
        const filtered = collect_(maybeAs, identity)

        if (Chunk.isEmpty(filtered)) {
          return T.succeed(false)
        } else {
          return this.self.offerAll(filtered)
        }
      })
    )
  }

  shutdown: T.UIO<void> = this.self.shutdown

  size: T.UIO<number> = this.self.size

  take: T.Effect<RB, EB, B> = this.self.take

  takeAll: T.Effect<RB, EB, Chunk.Chunk<B>> = this.self.takeAll

  takeUpTo(n: number): T.Effect<RB, EB, Chunk.Chunk<B>> {
    return this.self.takeUpTo(n)
  }
}

/**
 * Filters elements dequeued from the queue using the specified effectual
 * predicate.
 */
export function filterOutputM_<RA, RB, RB1, EB1, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RB1, EB1, boolean>
): XQueue<RA, RB & RB1, EA, EB | EB1, A, B> {
  concreteQueue(self)
  return new FilterOutputM(self, f)
}

class FilterOutputM<RA, RB, RB1, EB1, EA, EB, A, B> extends XQueueInternal<
  RA,
  RB & RB1,
  EA,
  EB | EB1,
  A,
  B
> {
  constructor(
    readonly self: XQueueInternal<RA, RB, EA, EB, A, B>,
    readonly f: (b: B) => T.Effect<RB1, EB1, boolean>
  ) {
    super()
  }

  awaitShutdown: T.UIO<void> = this.self.awaitShutdown

  capacity: number = this.self.capacity

  isShutdown: T.UIO<boolean> = this.self.isShutdown

  offer(a: A): T.Effect<RA, EA, boolean> {
    return this.self.offer(a)
  }

  offerAll(as: Iterable<A>): T.Effect<RA, EA, boolean> {
    return this.self.offerAll(as)
  }

  shutdown: T.UIO<void> = this.self.shutdown

  size: T.UIO<number> = this.self.size

  take: T.Effect<RB & RB1, EB1 | EB, B> = T.chain_(this.self.take, (b) => {
    return T.chain_(this.f(b), (p) => {
      return p ? T.succeed(b) : this.take
    })
  })

  takeAll: T.Effect<RB & RB1, EB | EB1, Chunk.Chunk<B>> = T.chain_(
    this.self.takeAll,
    (bs) => filterEffect_(bs, this.f)
  )

  loop(max: number, acc: Chunk.Chunk<B>): T.Effect<RB & RB1, EB | EB1, Chunk.Chunk<B>> {
    return T.chain_(this.self.takeUpTo(max), (bs) => {
      if (Chunk.isEmpty(bs)) {
        return T.succeed(acc)
      }

      return T.chain_(filterEffect_(bs, this.f), (filtered) => {
        const length = Chunk.size(filtered)

        if (length === max) {
          return T.succeed(Chunk.concat_(acc, filtered))
        } else {
          return this.loop(max - length, Chunk.concat_(acc, filtered))
        }
      })
    })
  }

  takeUpTo(n: number): T.Effect<RB & RB1, EB | EB1, Chunk.Chunk<B>> {
    return T.suspend(() => {
      return this.loop(n, Chunk.empty())
    })
  }
}

/**
 * Filters elements dequeued from the queue using the specified effectual
 * predicate.
 *
 * @ets_data_first filterOutputM_
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
 *
 * @ets_data_first filterOutput_
 */
export function filterOutput<B>(f: (b: B) => boolean) {
  return <RA, RB, EA, EB, A>(self: XQueue<RA, RB, EA, EB, A, B>) =>
    filterOutput_(self, f)
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 *
 * @ets_data_first filterInput_
 */
export function filterInput<A, A1 extends A>(f: (_: A1) => boolean) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA, RB, EA, EB, A1, B> => filterInput_(self, f)
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
 *
 * @ets_data_first map_
 */
export function map<RA, RB, EA, EB, A, B, C>(f: (b: B) => C) {
  return (self: XQueue<RA, RB, EA, EB, A, B>) => map_(self, f)
}

/**
 * Transforms elements dequeued from this queue with an effectful function.
 *
 * @ets_data_first mapM_
 */
export function mapM<B, R2, E2, C>(f: (b: B) => T.Effect<R2, E2, C>) {
  return <RA, RB, EA, EB, A>(self: XQueue<RA, RB, EA, EB, A, B>) => mapM_(self, f)
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
  concreteQueue(self)
  return T.map_(self.takeUpTo(1), (x) => Chunk.unsafeGet_(x, 0))
}
