import { Chunk } from "../../../collection/immutable/Chunk"
import * as Iter from "../../../collection/immutable/Iterable"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { AtomicBoolean } from "../../../support/AtomicBoolean"
import { AtomicNumber } from "../../../support/AtomicNumber"
import { EmptyQueue, MutableQueue } from "../../../support/MutableQueue"
import { Cause } from "../../Cause"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import { Exit } from "../../Exit"
import type { Fiber } from "../../Fiber/definition"
import { FiberId } from "../../FiberId"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../../Managed/definition"
import { Promise } from "../../Promise"
import type { Queue, Strategy } from "../../Queue"
import { concreteQueue, XQueueInternal } from "../../Queue/definition"
import { unsafeCompletePromise } from "../../Queue/operations/_internal/unsafeCompletePromise"
import { unsafeCompleteTakers } from "../../Queue/operations/_internal/unsafeCompleteTakers"
import { unsafeOfferAll } from "../../Queue/operations/_internal/unsafeOfferAll"
import { unsafePollAll } from "../../Queue/operations/_internal/unsafePollAll"
import { unsafePollN } from "../../Queue/operations/_internal/unsafePollN"
import { unsafeRemove } from "../../Queue/operations/_internal/unsafeRemove"
import { ReleaseMap } from "../../Scope/ReleaseMap/definition"
import type { State } from "../../Scope/ReleaseMap/state"
import { Exited } from "../../Scope/ReleaseMap/state"
import type { RIO, UIO } from "../definition"
import { Effect } from "../definition"

// -----------------------------------------------------------------------------
// forEach
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Iterable<A>` and returns
 * the results in a new `Chunk<B>`.
 *
 * For a parallel version of this method, see `forEachPar`. If you do not need
 * the results, see `forEachDiscard` for a more efficient implementation.
 *
 * @tsplus static ets/EffectOps forEach
 */
export function forEach<A, R, E, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(() => {
    const acc: B[] = []
    return Effect.forEachDiscard(as, (a) =>
      f(a).map((b) => {
        acc.push(b)
      })
    ).map(() => Chunk.from(acc))
  })
}

// -----------------------------------------------------------------------------
// forEachWithIndex
// -----------------------------------------------------------------------------

/**
 * Same as `forEach`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @tsplus static ets/EffectOps forEachWithIndex
 */
export function forEachWithIndex<A, R, E, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A, i: number) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(() => {
    let index = 0
    const acc: B[] = []
    return Effect.forEachDiscard(as, (a) =>
      f(a, index).map((b) => {
        acc.push(b)
        index++
      })
    ).map(() => Chunk.from(acc))
  })
}

// -----------------------------------------------------------------------------
// forEachDiscard
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @tsplus static ets/EffectOps forEachDiscard
 */
export function forEachDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, X>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.succeed(as).flatMap((iterable) =>
    forEachDiscardLoop(iterable[Symbol.iterator](), f)
  )
}

function forEachDiscardLoop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  const next = iterator.next()
  return next.done ? Effect.unit : f(next.value) > forEachDiscardLoop(iterator, f)
}

// -----------------------------------------------------------------------------
// forEachPar
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @tsplus static ets/EffectOps forEachPar
 */
export function forEachPar<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.parallelismWith((option) =>
    option.fold(
      () => forEachParUnbounded(as, f),
      (n) => forEachParN(as, n, f)
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 */
function forEachParUnbounded<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(
    Effect.succeed<B[]>([]).flatMap((array) =>
      forEachParUnboundedDiscard(
        Iter.map_(as(), (a, n) => [a, n] as [A, number]),
        ([a, n]) =>
          Effect.suspendSucceed(f(a)).flatMap((b) =>
            Effect.succeed(() => {
              array[n] = b
            })
          )
      ).map(() => Chunk.from(array))
    )
  )
}

function forEachParN<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed<R, E, Chunk<B>>(() => {
    if (n < 1) {
      return Effect.dieMessage(
        `Unexpected nonpositive value "${n}" passed to foreachParN`
      )
    }

    const as0 = Chunk.from(as())
    const size = as0.size

    if (size === 0) {
      return Effect.succeedNow(Chunk.empty())
    }

    function worker(
      queue: Queue<Tuple<[A, number]>>,
      array: Array<B>
    ): Effect<R, E, void> {
      concreteQueue(queue)
      return queue
        ._takeUpTo(1)
        .map((_) => _.head)
        .flatMap((_) =>
          _.fold(
            () => Effect.unit,
            ({ tuple: [a, n] }) =>
              f(a)
                .tap((b) =>
                  Effect.succeed(() => {
                    array[n] = b
                  })
                )
                .flatMap(() => worker(queue, array))
          )
        )
    }

    return Effect.succeed(new Array<B>(size)).flatMap((array) =>
      makeBoundedQueue<Tuple<[A, number]>>(size).flatMap((queue) =>
        queue
          .offerAll(as0.zipWithIndex())
          .flatMap(() =>
            forEachParUnboundedDiscard(worker(queue, array).replicate(n), identity).map(
              () => Chunk.from(array)
            )
          )
      )
    )
  })
}

// -----------------------------------------------------------------------------
// forEachParWithIndex
// -----------------------------------------------------------------------------

/**
 * Same as `forEachPar_`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @tsplus static ets/EffectOps forEachParWithIndex
 */
export function forEachParWithIndex<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A, i: number) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(
    Effect.succeed<B[]>([]).flatMap((array) =>
      Effect.forEachParDiscard(
        Iter.map_(as(), (a, n) => [a, n] as [A, number]),
        ([a, n]) =>
          Effect.suspendSucceed(f(a, n)).flatMap((b) =>
            Effect.succeed(() => {
              array[n] = b
            })
          )
      ).map(() => Chunk.from(array))
    )
  )
}

// -----------------------------------------------------------------------------
// forEachParDiscard
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEachDiscard`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences. Additionally, interrupts all effects
 * on any failure.
 *
 * @tsplus static ets/EffectOps forEachParDiscard
 */
export function forEachParDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, X>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.parallelismWith((option) =>
    option.fold(
      () => forEachParUnboundedDiscard(as, f),
      (n) => forEachParNDiscard(as, n, f)
    )
  )
}

function forEachParUnboundedDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, X>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.suspendSucceed<R, E, void>(() => {
    const bs = Chunk.from(as())
    const size = bs.size

    if (size === 0) {
      return Effect.unit
    }

    return Effect.uninterruptibleMask(({ restore }) => {
      const promise = Promise.unsafeMake<void, void>(FiberId.none)
      const ref = new AtomicNumber(0)

      return Effect.transplant((graft) =>
        Effect.forEach(bs, (a) =>
          graft(
            restore(Effect.suspendSucceed(f(a))).foldCauseEffect(
              (cause) => promise.fail(undefined) > Effect.failCauseNow(cause),
              () => {
                if (ref.incrementAndGet() === size) {
                  promise.unsafeDone(Effect.unit)
                  return Effect.unit
                } else {
                  return Effect.unit
                }
              }
            )
          ).forkDaemon()
        )
      ).flatMap((fibers) =>
        restore(promise.await()).foldCauseEffect(
          (cause) =>
            forEachParUnbounded(fibers, (fiber) => fiber.interrupt()).flatMap(
              (exits) => {
                const collected = Exit.collectAllPar(exits)
                if (collected._tag === "Some" && collected.value._tag === "Failure") {
                  return Effect.failCause(
                    Cause.both(cause.stripFailures(), collected.value.cause)
                  )
                }
                return Effect.failCause(cause.stripFailures())
              }
            ),
          (_) => Effect.forEachDiscard(fibers, (fiber) => fiber.inheritRefs())
        )
      )
    })
  })
}

function forEachParNDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  n: number,
  f: (a: A) => Effect<R, E, X>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.suspendSucceed(() => {
    const as0 = as()
    const bs = Chunk.from(as0)
    const size = bs.size

    if (size === 0) {
      return Effect.unit
    }

    function worker(queue: Queue<A>): Effect<R, E, void> {
      concreteQueue(queue)
      return queue
        ._takeUpTo(1)
        .map((chunk) => chunk.head)
        .flatMap((option) =>
          option.fold(
            () => Effect.unit,
            (a) => f(a).flatMap(() => worker(queue))
          )
        )
    }

    return makeBoundedQueue<A>(size).flatMap((queue) =>
      queue
        .offerAll(as0)
        .flatMap(() => forEachParUnboundedDiscard(worker(queue).replicate(n), identity))
    )
  })
}

// -----------------------------------------------------------------------------
// forEachExec
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Iterable<A>` and returns
 * the result in a new `Chunk<B>` using the specified execution strategy.
 *
 * @tsplus static ets/EffectOps forEachExec
 */
export function forEachExec<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  strategy: ExecutionStrategy,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(() => {
    switch (strategy._tag) {
      case "Parallel": {
        return Effect.forEachPar(as, f).withParallelismUnbounded()
      }
      case "ParallelN": {
        return Effect.forEachPar(as, f).withParallelism(strategy.n)
      }
      case "Sequential": {
        return Effect.forEach(as, f)
      }
    }
  })
}

// -----------------------------------------------------------------------------
// collectAll
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 *
 * @tsplus static ets/EffectOps collectAll
 */
export function collectAll<R, E, A>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  __tsplusTrace?: string
) {
  return Effect.forEach(as, identity)
}

// -----------------------------------------------------------------------------
// collectAllPar
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * @tsplus static ets/EffectOps collectAllPar
 */
export function collectAllPar<R, E, A>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.forEachPar(as, identity)
}

// -----------------------------------------------------------------------------
// collectAllDiscard
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllParDiscard`.
 *
 * @tsplus static ets/EffectOps collectAllDiscard
 */
export function collectAllDiscard<R, E, A>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.forEachDiscard(as, identity)
}

// -----------------------------------------------------------------------------
// collectAllParDiscard
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllDiscard`.
 *
 * @tsplus static ets/EffectOps collectAllParDiscard
 */
export function collectAllParDiscard<R, E, A>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.forEachParDiscard(as, identity)
}

// -----------------------------------------------------------------------------
// collectAllWith
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @tsplus static ets/EffectOps collectAllWith
 */
export function collectAllWith<R, E, A, B>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  pf: (a: A) => Option<B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.collectAll(as).map((chunk) => chunk.collect(pf))
}

// -----------------------------------------------------------------------------
// collectAllWithPar
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @tsplus static ets/EffectOps collectAllWithPar
 */
export function collectAllWithPar<R, E, A, B>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  pf: (a: A) => Option<B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.collectAllPar(as).map((chunk) => chunk.collect(pf))
}

// -----------------------------------------------------------------------------
// collectAllSuccesses
// -----------------------------------------------------------------------------

/**
 * Evaluate and run each effect in the structure and collect discarding failed ones.
 *
 * @tsplus static ets/EffectOps collectAllSuccesses
 */
export function collectAllSuccesses<R, E, A>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  __tsplusTrace?: string
): Effect<R, never, Chunk<A>> {
  return Effect.collectAllWith(
    Iter.map_(as(), (effect) => effect.exit()),
    (exit) => (exit._tag === "Success" ? Option.some(exit.value) : Option.none)
  )
}

// -----------------------------------------------------------------------------
// collectAllSuccessesPar
// -----------------------------------------------------------------------------

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * @tsplus static ets/EffectOps collectAllSuccessesPar
 */
export function collectAllSuccessesPar<R, E, A>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  __tsplusTrace?: string
): Effect<R, never, Chunk<A>> {
  return Effect.collectAllWithPar(
    Iter.map_(as(), (effect) => effect.exit()),
    (exit) => (exit._tag === "Success" ? Option.some(exit.value) : Option.none)
  )
}

// -----------------------------------------------------------------------------
// Fiber
// -----------------------------------------------------------------------------

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export function fiberJoinAll<E, A>(
  as: LazyArg<Iterable<Fiber<E, A>>>,
  __tsplusTrace?: string
): Effect<unknown, E, Chunk<A>> {
  return fiberWaitAll(as)
    .flatMap((exit) => Effect.done(exit))
    .tap(() => Effect.forEach(as, (fiber) => fiber.inheritRefs()))
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function fiberWaitAll<E, A>(
  as: LazyArg<Iterable<Fiber<E, A>>>,
  __tsplusTrace?: string
): RIO<unknown, Exit<E, Chunk<A>>> {
  return Effect.forEachPar(as, (fiber) =>
    fiber.await().flatMap((exit) => Effect.done(exit))
  ).exit()
}

// -----------------------------------------------------------------------------
// ReleaseMap
// -----------------------------------------------------------------------------

/**
 * Releases all the finalizers in the releaseMap according to the ExecutionStrategy.
 */
export function releaseMapReleaseAll(
  self: ReleaseMap,
  ex: Exit<unknown, unknown>,
  execStrategy: ExecutionStrategy,
  __tsplusTrace?: string
): UIO<unknown> {
  return self.ref
    .modify((s): Tuple<[UIO<unknown>, State]> => {
      switch (s._tag) {
        case "Exited": {
          return Tuple(Effect.unit, s)
        }
        case "Running": {
          switch (execStrategy._tag) {
            case "Sequential": {
              return Tuple(
                Effect.forEach(Array.from(s.finalizers()).reverse(), ([_, f]) =>
                  s.update(f)(ex).exit()
                ).flatMap((results) =>
                  // @ts-expect-error
                  Effect.done(Exit.collectAll(results).getOrElse(Exit.unit))
                ),
                new Exited(s.nextKey, ex, s.update)
              )
            }
            case "Parallel": {
              return Tuple(
                Effect.forEachPar(Array.from(s.finalizers()).reverse(), ([_, f]) =>
                  s.update(f)(ex).exit()
                ).flatMap((results) =>
                  // @ts-expect-error
                  Effect.done(Exit.collectAllPar(results).getOrElse(Exit.unit))
                ),
                new Exited(s.nextKey, ex, s.update)
              )
            }
            case "ParallelN": {
              return Tuple(
                Effect.forEachPar(Array.from(s.finalizers()).reverse(), ([_, f]) =>
                  s.update(f)(ex).exit()
                )
                  .flatMap((results) =>
                    // @ts-expect-error
                    Effect.done(Exit.collectAllPar(results).getOrElse(Exit.unit))
                  )
                  .withParallelism(execStrategy.n) as UIO<unknown>,
                new Exited(s.nextKey, ex, s.update)
              )
            }
          }
        }
      }
    })
    .flatten()
}

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 */
export function managedFork<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, never, Fiber.Runtime<E, A>> {
  return Managed(
    Effect.uninterruptibleMask(({ restore }) =>
      Effect.Do()
        .bind("outerReleaseMap", () => FiberRef.currentReleaseMap.value.get())
        .bind("innerReleaseMap", () => ReleaseMap.make)
        .bind("fiber", ({ innerReleaseMap }) =>
          (
            restore(self.effect.map((_) => _.get(1))).forkDaemon() as RIO<
              R,
              Fiber.Runtime<E, A>
            >
          ).apply(FiberRef.currentReleaseMap.value.locally(innerReleaseMap))
        )
        .bind("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          outerReleaseMap.add((e) =>
            fiber
              .interrupt()
              .flatMap(() =>
                releaseMapReleaseAll(innerReleaseMap, e, ExecutionStrategy.Sequential)
              )
          )
        )
        .map(({ fiber, releaseMapEntry }) => Tuple(releaseMapEntry, fiber))
    )
  )
}

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export function managedUse<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => Effect<R2, E2, B>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, B> {
  return ReleaseMap.make.flatMap((releaseMap) =>
    FiberRef.currentReleaseMap.value
      .get()
      .acquireReleaseExitWith(
        () => self.effect.flatMap((_) => f(_.get(1))),
        (relMap, ex) => releaseMapReleaseAll(relMap, ex, ExecutionStrategy.Sequential)
      )
      .apply(FiberRef.currentReleaseMap.value.locally(releaseMap))
  )
}

// -----------------------------------------------------------------------------
// ReleaseMap
// -----------------------------------------------------------------------------

export function makeBoundedQueue<A>(
  requestedCapacity: number,
  __tsplusTrace?: string
): UIO<Queue<A>> {
  return Effect.succeed(MutableQueue.Bounded<A>(requestedCapacity)).flatMap((queue) =>
    createQueue(queue, new BackPressureStrategy())
  )
}

export function createQueue<A>(
  queue: MutableQueue<A>,
  strategy: Strategy<A>,
  __tsplusTrace?: string
): UIO<Queue<A>> {
  return Promise.make<never, void>().map((promise) =>
    unsafeCreateQueue(
      queue,
      MutableQueue.Unbounded(),
      promise,
      new AtomicBoolean(false),
      strategy
    )
  )
}

export function unsafeCreateQueue<A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Queue<A> {
  return new UnsafeCreate(queue, takers, shutdownHook, shutdownFlag, strategy)
}

export class UnsafeCreate<A> extends XQueueInternal<
  unknown,
  unknown,
  never,
  never,
  A,
  A
> {
  constructor(
    readonly queue: MutableQueue<A>,
    readonly takers: MutableQueue<Promise<never, A>>,
    readonly shutdownHook: Promise<never, void>,
    readonly shutdownFlag: AtomicBoolean,
    readonly strategy: Strategy<A>
  ) {
    super()
  }

  _capacity: number = this.queue.capacity

  _offer(a: A, __tsplusTrace?: string): Effect<unknown, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      }

      let noRemaining: boolean
      if (this.queue.isEmpty) {
        const taker = this.takers.poll(EmptyQueue)

        if (taker !== EmptyQueue) {
          unsafeCompletePromise(taker, a)
          noRemaining = true
        } else {
          noRemaining = false
        }
      } else {
        noRemaining = false
      }

      if (noRemaining) {
        return Effect.succeedNow(true)
      }

      // Not enough takers, offer to the queue
      const succeeded = this.queue.offer(a)

      unsafeCompleteTakers(this.strategy, this.queue, this.takers)

      return succeeded
        ? Effect.succeedNow(true)
        : this.strategy.handleSurplus(
            Chunk.single(a),
            this.queue,
            this.takers,
            this.shutdownFlag
          )
    })
  }

  _offerAll(as: Iterable<A>, __tsplusTrace?: string): Effect<unknown, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      }

      const as0 = Chunk.from(as)

      const pTakers = this.queue.isEmpty
        ? unsafePollN(this.takers, as0.size)
        : Chunk.empty<Promise<never, A>>()
      const {
        tuple: [forTakers, remaining]
      } = as0.splitAt(pTakers.size)

      pTakers.zip(forTakers).forEach(({ tuple: [taker, item] }) => {
        unsafeCompletePromise(taker, item)
      })

      if (remaining.isEmpty()) {
        return Effect.succeedNow(true)
      }

      // Not enough takers, offer to the queue
      const surplus = unsafeOfferAll(this.queue, remaining)

      unsafeCompleteTakers(this.strategy, this.queue, this.takers)

      return surplus.isEmpty()
        ? Effect.succeedNow(true)
        : this.strategy.handleSurplus(
            surplus,
            this.queue,
            this.takers,
            this.shutdownFlag
          )
    })
  }

  _awaitShutdown: UIO<void> = this.shutdownHook.await()

  _size: UIO<number> = Effect.suspendSucceed(
    this.shutdownFlag.get
      ? Effect.interrupt
      : Effect.succeedNow(
          this.queue.size - this.takers.size + this.strategy.surplusSize
        )
  )

  _shutdown: UIO<void> = Effect.suspendSucceedWith((_, fiberId) => {
    this.shutdownFlag.set(true)

    return Effect.whenEffect(
      this.shutdownHook.succeed(undefined),
      Effect.forEachParDiscard(unsafePollAll(this.takers), (promise) =>
        promise.interruptAs(fiberId)
      ) > this.strategy.shutdown
    ).asUnit()
  }).uninterruptible()

  _isShutdown: UIO<boolean> = Effect.succeed(this.shutdownFlag.get)

  _take: Effect<unknown, never, A> = Effect.suspendSucceedWith((_, fiberId) => {
    if (this.shutdownFlag.get) {
      return Effect.interrupt
    }

    const item = this.queue.poll(EmptyQueue)

    if (item !== EmptyQueue) {
      this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
      return Effect.succeedNow(item)
    } else {
      // Add the promise to takers, then:
      // - Try to take again in case a value was added since
      // - Wait for the promise to be completed
      // - Clean up resources in case of interruption
      const promise = Promise.unsafeMake<never, A>(fiberId)

      return Effect.suspendSucceed(() => {
        this.takers.offer(promise)
        unsafeCompleteTakers(this.strategy, this.queue, this.takers)
        return this.shutdownFlag.get ? Effect.interrupt : promise.await()
      }).onInterrupt(() => {
        return Effect.succeed(unsafeRemove(this.takers, promise))
      })
    }
  })

  _takeAll: Effect<unknown, never, Chunk<A>> = Effect.suspendSucceed(() =>
    this.shutdownFlag.get
      ? Effect.interrupt
      : Effect.succeed(() => {
          const as = unsafePollAll(this.queue)
          this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
          return as
        })
  )

  _takeUpTo(n: number, __tsplusTrace?: string): Effect<unknown, never, Chunk<A>> {
    return Effect.suspendSucceed(() =>
      this.shutdownFlag.get
        ? Effect.interrupt
        : Effect.succeed(() => {
            const as = unsafePollN(this.queue, n)
            this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
            return as
          })
    )
  }
}

export function makeBackPressureStrategy<A>() {
  return new BackPressureStrategy<A>()
}

export class BackPressureStrategy<A> implements Strategy<A> {
  /**
   * - `A` is an item to add
   * - `Promise<never, boolean>` is the promise completing the whole `offerAll`
   * - `boolean` indicates if it's the last item to offer (promise should be
   *    completed once this item is added)
   */
  private putters =
    MutableQueue.Unbounded<Tuple<[A, Promise<never, boolean>, boolean]>>()

  handleSurplus(
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean,
    __tsplusTrace?: string
  ): UIO<boolean> {
    return Effect.suspendSucceedWith((_, fiberId) => {
      const promise = Promise.unsafeMake<never, boolean>(fiberId)

      return Effect.suspendSucceed(() => {
        this.unsafeOffer(as, promise)
        this.unsafeOnQueueEmptySpace(queue, takers)
        unsafeCompleteTakers(this, queue, takers)
        return isShutdown.get ? Effect.interrupt : promise.await()
      }).onInterrupt(() => Effect.succeed(this.unsafeRemove(promise)))
    })
  }

  unsafeRemove(promise: Promise<never, boolean>): void {
    unsafeOfferAll(
      this.putters,
      unsafePollAll(this.putters).filter(({ tuple: [, _] }) => _ !== promise)
    )
  }

  unsafeOffer(as: Chunk<A>, promise: Promise<never, boolean>): void {
    let bs = as

    while (bs.size > 0) {
      const head = bs.unsafeGet(0)!

      bs = bs.drop(1)

      if (bs.size === 0) {
        this.putters.offer(Tuple(head, promise, true))
      } else {
        this.putters.offer(Tuple(head, promise, false))
      }
    }
  }

  unsafeOnQueueEmptySpace(
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>
  ): void {
    let keepPolling = true

    while (keepPolling && !queue.isFull) {
      const putter = this.putters.poll(EmptyQueue)

      if (putter !== EmptyQueue) {
        const offered = queue.offer(putter.get(0))

        if (offered && putter.get(2)) {
          unsafeCompletePromise(putter.get(1), true)
        } else if (!offered) {
          unsafeOfferAll(this.putters, unsafePollAll(this.putters).prepend(putter))
        }
        unsafeCompleteTakers(this, queue, takers)
      } else {
        keepPolling = false
      }
    }
  }

  get surplusSize(): number {
    return this.putters.size
  }

  get shutdown(): UIO<void> {
    return Effect.Do()
      .bind("fiberId", () => Effect.fiberId)
      .bind("putters", () => Effect.succeed(unsafePollAll(this.putters)))
      .tap(({ fiberId, putters }) =>
        Effect.forEachPar(putters, ({ tuple: [_, promise, lastItem] }) =>
          lastItem ? promise.interruptAs(fiberId) : Effect.unit
        )
      )
      .asUnit()
  }
}
