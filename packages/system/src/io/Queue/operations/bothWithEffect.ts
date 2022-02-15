import type { Chunk } from "../../../collection/immutable/Chunk"
import { constVoid } from "../../../data/Function"
import type { Effect, UIO } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue, XQueueInternal } from "../definition"

/**
 * Creates a new queue from this queue and another. Offering to the composite
 * queue will broadcast the elements to both queues; taking from the composite
 * queue will dequeue elements from both queues and apply the function
 * point-wise.
 *
 * Note that using queues with different strategies may result in surprising
 * behavior. For example, a dropping queue and a bounded queue composed together
 * may apply `f` to different elements.
 *
 * @tsplus fluent ets/Queue bothWithEffect
 * @tsplus fluent ets/XQueue bothWithEffect
 * @tsplus fluent ets/Dequeue bothWithEffect
 * @tsplus fluent ets/XDequeue bothWithEffect
 * @tsplus fluent ets/Enqueue bothWithEffect
 * @tsplus fluent ets/XEnqueue bothWithEffect
 */
export function bothWithEffect_<
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
  f: (b: B, c: C) => Effect<R3, E3, D>
): XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> {
  concreteQueue(self)
  concreteQueue(that)
  return new BothWithEffect(self, that, f)
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
 * @ets_data_first bothWithEffect_
 */
export function bothWithEffect<RA1, RB1, EA1, EB1, A1 extends A, C, B, R3, E3, D, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => Effect<R3, E3, D>
) {
  return <RA, RB, EA, EB>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, A1, D> =>
    self.bothWithEffect(that, f)
}

class BothWithEffect<
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
    readonly f: (b: B, c: C) => Effect<R3, E3, D>
  ) {
    super()
  }

  _awaitShutdown: UIO<void> = this.self._awaitShutdown.flatMap(
    () => this.that._awaitShutdown
  )

  _capacity: number = Math.min(this.self._capacity, this.that._capacity)

  _isShutdown: UIO<boolean> = this.self._isShutdown

  _offer(a: A1, __etsTrace?: string): Effect<RA & RA1, EA1 | EA, boolean> {
    return this.self._offer(a).zipWithPar(this.that._offer(a), (x, y) => x && y)
  }

  _offerAll(
    as: Iterable<A1>,
    __etsTrace?: string
  ): Effect<RA & RA1, EA1 | EA, boolean> {
    return this.self._offerAll(as).zipWithPar(this.that._offerAll(as), (x, y) => x && y)
  }

  _shutdown: UIO<void> = this.self._shutdown.zipWithPar(this.that._shutdown, constVoid)

  _size: UIO<number> = this.self._size.zipWithPar(this.that._size, (x, y) =>
    Math.max(x, y)
  )

  _take: Effect<RB & RB1 & R3, E3 | EB | EB1, D> = this.self._take
    .zipPar(this.that._take)
    .flatMap(({ tuple: [b, c] }) => this.f(b, c))

  _takeAll: Effect<RB & RB1 & R3, E3 | EB | EB1, Chunk<D>> = this.self._takeAll
    .zipPar(this.that._takeAll)
    .flatMap(({ tuple: [bs, cs] }) =>
      bs.zip(cs).mapEffect(({ tuple: [b, c] }) => this.f(b, c))
    )

  _takeUpTo(
    max: number,
    __etsTrace?: string
  ): Effect<RB & RB1 & R3, E3 | EB | EB1, Chunk<D>> {
    return this.self
      ._takeUpTo(max)
      .zipPar(this.that._takeUpTo(max))
      .flatMap(({ tuple: [bs, cs] }) =>
        bs.zip(cs).mapEffect(({ tuple: [b, c] }) => this.f(b, c))
      )
  }
}
