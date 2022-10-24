import { Effect } from "@effect/core/io/Effect/definition/base"
import { _In, _Out, QueueSym } from "@effect/core/io/Queue/definition"
import { unsafeCompleteDeferred } from "@effect/core/io/Queue/operations/_internal/unsafeCompleteDeferred"
import { unsafeCompleteTakers } from "@effect/core/io/Queue/operations/_internal/unsafeCompleteTakers"
import { unsafeOfferAll } from "@effect/core/io/Queue/operations/_internal/unsafeOfferAll"
import { unsafePollAll } from "@effect/core/io/Queue/operations/_internal/unsafePollAll"
import { unsafePollN } from "@effect/core/io/Queue/operations/_internal/unsafePollN"
import { unsafeRemove } from "@effect/core/io/Queue/operations/_internal/unsafeRemove"
import type { Strategy } from "@effect/core/io/Queue/operations/strategy"
import type { State } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import { Exited } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import * as Chunk from "@fp-ts/data/Chunk"
import { identity, pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

// -----------------------------------------------------------------------------
// forEach
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Collection<A>` and returns
 * the results in a new `Chunk<B>`.
 *
 * For a parallel version of this method, see `forEachPar`. If you do not need
 * the results, see `forEachDiscard` for a more efficient implementation.
 *
 * @tsplus static effect/core/io/Effect.Ops forEach
 */
export function forEach<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.suspendSucceed(() => {
    const acc: B[] = []
    return Effect.forEachDiscard(as, (a) =>
      f(a).map((b) => {
        acc.push(b)
      })).map(() => Chunk.fromIterable(acc))
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
 * @tsplus static effect/core/io/Effect.Ops forEachWithIndex
 */
export function forEachWithIndex<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.suspendSucceed(() => {
    let index = 0
    const acc: B[] = []
    return Effect.forEachDiscard(as, (a) =>
      f(a, index).map((b) => {
        acc.push(b)
        index++
      })).map(() => Chunk.fromIterable(acc))
  })
}

// -----------------------------------------------------------------------------
// forEachDiscard
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Collection<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `unit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @tsplus static effect/core/io/Effect.Ops forEachDiscard
 */
export function forEachDiscard<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  return Effect.suspendSucceed(
    forEachDiscardLoop(as[Symbol.iterator](), f)
  )
}

function forEachDiscardLoop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  const next = iterator.next()
  return next.done ? Effect.unit : f(next.value).flatMap(() => forEachDiscardLoop(iterator, f))
}

// -----------------------------------------------------------------------------
// forEachPar
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Collection<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @tsplus static effect/core/io/Effect.Ops forEachPar
 */
export function forEachPar<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.parallelismWith((option) => {
    switch (option._tag) {
      case "None": {
        return forEachParUnbounded(as, f)
      }
      case "Some": {
        return forEachParN(as, option.value, f)
      }
    }
  })
}

/**
 * Applies the function `f` to each element of the `Collection<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 */
function forEachParUnbounded<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.suspendSucceed(
    Effect.succeed<Array<B>>([]).flatMap((array) =>
      forEachParUnboundedDiscard(
        Array.from(as).map((a, n) => [a, n] as [A, number]),
        ([a, n]) =>
          Effect.suspendSucceed(f(a)).flatMap((b) =>
            Effect.sync(() => {
              array[n] = b
            })
          )
      ).map(() => Chunk.fromIterable(array))
    )
  )
}

function forEachParN<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.suspendSucceed<R, E, Chunk.Chunk<B>>(() => {
    if (n < 1) {
      return Effect.dieMessage(
        `Unexpected nonpositive value "${n}" passed to foreachParN`
      )
    }

    const as0 = Chunk.fromIterable(as)
    const size = as0.length

    if (size === 0) {
      return Effect.succeed(Chunk.empty)
    }

    function worker(
      queue: Queue<readonly [A, number]>,
      array: Array<B>
    ): Effect<R, E, void> {
      return queue
        .takeUpTo(1)
        .map((chunk) => Chunk.head(chunk))
        .flatMap((option) => {
          switch (option._tag) {
            case "None": {
              return Effect.unit
            }
            case "Some": {
              const [a, n] = option.value
              return f(a).tap((b) =>
                Effect.sync(() => {
                  array[n] = b
                })
              ).flatMap(() => worker(queue, array))
            }
          }
        })
    }

    return Effect.sync(new Array<B>(size)).flatMap((array) =>
      makeBoundedQueue<readonly [A, number]>(size).flatMap((queue) =>
        queue
          .offerAll(Chunk.zipWithIndex(as0))
          .flatMap(() =>
            forEachParUnboundedDiscard(worker(queue, array).replicate(n), identity).map(
              () => Chunk.fromIterable(array)
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
 * Same as `forEachPar`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @tsplus static effect/core/io/Effect.Ops forEachParWithIndex
 */
export function forEachParWithIndex<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.suspendSucceed(
    Effect.sync<B[]>([]).flatMap((array) =>
      Effect.forEachParDiscard(
        Array.from(as).map((a, n) => [a, n] as [A, number]),
        ([a, n]) =>
          Effect.suspendSucceed(f(a, n)).flatMap((b) =>
            Effect.sync(() => {
              array[n] = b
            })
          )
      ).map(() => Chunk.fromIterable(array))
    )
  )
}

// -----------------------------------------------------------------------------
// forEachParDiscard
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Collection<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEachDiscard`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences. Additionally, interrupts all effects
 * on any failure.
 *
 * @tsplus static effect/core/io/Effect.Ops forEachParDiscard
 */
export function forEachParDiscard<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  return Effect.parallelismWith((option) => {
    switch (option._tag) {
      case "None": {
        return forEachParUnboundedDiscard(as, f)
      }
      case "Some": {
        return forEachParNDiscard(as, option.value, f)
      }
    }
  })
}

function forEachParUnboundedDiscard<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  return Effect.suspendSucceed<R, E, void>(() => {
    const bs = Chunk.fromIterable(as)
    const size = bs.length

    if (size === 0) {
      return Effect.unit
    }

    return Effect.uninterruptibleMask(({ restore }) => {
      const deferred = Deferred.unsafeMake<void, void>(FiberId.none)
      const ref = MutableRef.make(0)

      return Effect.transplant((graft) =>
        Effect.forEach(bs, (a) =>
          graft(
            restore(Effect.suspendSucceed(f(a))).foldCauseEffect(
              (cause) => deferred.fail(undefined) > Effect.failCause(cause),
              () => {
                let value = MutableRef.get(ref)
                pipe(ref, MutableRef.set(value + 1))
                value = MutableRef.get(ref)
                if (value === size) {
                  deferred.unsafeDone(Effect.unit)
                  return Effect.unit
                } else {
                  return Effect.unit
                }
              }
            )
          ).forkDaemon)
      ).flatMap((fibers) =>
        restore(deferred.await).foldCauseEffect(
          (cause) =>
            forEachParUnbounded(fibers, (fiber) => fiber.interrupt).flatMap(
              (exits) => {
                const collected = Exit.collectAllPar(exits)
                if (collected._tag === "Some" && collected.value._tag === "Failure") {
                  return Effect.failCause(
                    Cause.both(cause.stripFailures, collected.value.cause)
                  )
                }
                return Effect.failCause(cause.stripFailures)
              }
            ),
          (_) => Effect.forEachDiscard(fibers, (fiber) => fiber.inheritAll)
        )
      )
    })
  })
}

function forEachParNDiscard<R, E, A, X>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  return Effect.suspendSucceed(() => {
    const bs = Chunk.fromIterable(as)
    const size = bs.length

    if (size === 0) {
      return Effect.unit
    }

    function worker(queue: Queue<A>): Effect<R, E, void> {
      return queue
        .takeUpTo(1)
        .map(Chunk.head)
        .flatMap((option) => {
          switch (option._tag) {
            case "None": {
              return Effect.unit
            }
            case "Some": {
              return f(option.value).flatMap(() => worker(queue))
            }
          }
        })
    }

    return makeBoundedQueue<A>(size).flatMap((queue) =>
      queue
        .offerAll(as)
        .flatMap(() => forEachParUnboundedDiscard(worker(queue).replicate(n), identity))
    )
  })
}

// -----------------------------------------------------------------------------
// forEachExec
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Collection<A>` and returns
 * the result in a new `Chunk<B>` using the specified execution strategy.
 *
 * @tsplus static effect/core/io/Effect.Ops forEachExec
 */
export function forEachExec<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  strategy: ExecutionStrategy
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.suspendSucceed(() => {
    switch (strategy._tag) {
      case "Parallel": {
        return Effect.forEachPar(as, f).withParallelismUnbounded
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
 * @tsplus static effect/core/io/Effect.Ops collectAll
 */
export function collectAll<R, E, A>(as: Iterable<Effect<R, E, A>>) {
  return Effect.forEach(as, identity)
}

// -----------------------------------------------------------------------------
// collectAllPar
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * @tsplus static effect/core/io/Effect.Ops collectAllPar
 */
export function collectAllPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>
): Effect<R, E, Chunk.Chunk<A>> {
  return Effect.forEachPar(as, identity)
}

// -----------------------------------------------------------------------------
// collectAllDiscard
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllParDiscard`.
 *
 * @tsplus static effect/core/io/Effect.Ops collectAllDiscard
 */
export function collectAllDiscard<R, E, A>(
  as: Iterable<Effect<R, E, A>>
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
 * @tsplus static effect/core/io/Effect.Ops collectAllParDiscard
 */
export function collectAllParDiscard<R, E, A>(
  as: Iterable<Effect<R, E, A>>
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
 * @tsplus static effect/core/io/Effect.Ops collectAllWith
 */
export function collectAllWith<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => Option.Option<B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.collectAll(as).map(Chunk.filterMap(pf))
}

// -----------------------------------------------------------------------------
// collectAllWithPar
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @tsplus static effect/core/io/Effect.Ops collectAllWithPar
 */
export function collectAllWithPar<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => Option.Option<B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.collectAllPar(as).map(Chunk.filterMap(pf))
}

// -----------------------------------------------------------------------------
// collectAllWithEffect
// -----------------------------------------------------------------------------

/**
 * Returns a filtered, mapped subset of the elements of this chunk based on a
 * partial function.
 *
 * @tsplus static effect/core/io/Effect.Ops collectAllWithEffect
 */
export function collectAllWithEffect<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Option.Option<Effect<R, E, B>>
): Effect<R, E, Chunk.Chunk<B>> {
  const array = Array.from(as)
  // Break out early if there are no elements
  if (array.length === 0) {
    return Effect.succeed(Chunk.empty)
  }
  // Break out early if there is only one element
  if (array.length === 1) {
    const option = f(array[0]!)
    switch (option._tag) {
      case "None": {
        return Effect.succeed(Chunk.empty)
      }
      case "Some": {
        return option.value.map(Chunk.single)
      }
    }
  }
  // Otherwise create the intermediate result structure
  let result: Effect<R, E, List.List<B>> = Effect.succeed(List.empty<B>())
  for (let i = array.length - 1; i >= 0; i--) {
    const option = f(array[i]!)
    if (option._tag === "Some") {
      result = result.zipWith(option.value, (list, b) => pipe(list, List.prepend(b)))
    }
  }
  return result.map(Chunk.fromIterable)
}

// -----------------------------------------------------------------------------
// collectAllSuccesses
// -----------------------------------------------------------------------------

/**
 * Evaluate and run each effect in the structure and collect discarding failed ones.
 *
 * @tsplus static effect/core/io/Effect.Ops collectAllSuccesses
 */
export function collectAllSuccesses<R, E, A>(
  as: Iterable<Effect<R, E, A>>
): Effect<R, never, Chunk.Chunk<A>> {
  return Effect.collectAllWith(
    Array.from(as).map((effect) => effect.exit),
    (exit) => (exit._tag === "Success" ? Option.some(exit.value) : Option.none)
  )
}

// -----------------------------------------------------------------------------
// collectAllSuccessesPar
// -----------------------------------------------------------------------------

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * @tsplus static effect/core/io/Effect.Ops collectAllSuccessesPar
 */
export function collectAllSuccessesPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>
): Effect<R, never, Chunk.Chunk<A>> {
  return Effect.collectAllWithPar(
    Array.from(as).map((effect) => effect.exit),
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
  as: Iterable<Fiber<E, A>>
): Effect<never, E, Chunk.Chunk<A>> {
  return fiberWaitAll(as).flatten.tap(() => Effect.forEach(as, (fiber) => fiber.inheritAll))
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function fiberWaitAll<E, A>(
  as: Iterable<Fiber<E, A>>
): Effect<never, never, Exit<E, Chunk.Chunk<A>>> {
  return Effect.forEachPar(as, (fiber) => fiber.await.flatten).exit
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
  execStrategy: ExecutionStrategy
): Effect<never, never, unknown> {
  return self.ref
    .modify((s): readonly [Effect<never, never, unknown>, State] => {
      switch (s._tag) {
        case "Exited": {
          return [Effect.unit, s] as const
        }
        case "Running": {
          switch (execStrategy._tag) {
            case "Sequential": {
              return [
                Effect.forEach(
                  Array.from(s.finalizers()).reverse(),
                  ([_, f]) => s.update(f)(ex).exit
                ).flatMap((results) => pipe(Exit.collectAll(results), Option.getOrElse(Exit.unit))),
                new Exited(s.nextKey, ex, s.update)
              ] as const
            }
            case "Parallel": {
              return [
                Effect.forEachPar(
                  Array.from(s.finalizers()).reverse(),
                  ([_, f]) => s.update(f)(ex).exit
                ).flatMap((results) =>
                  pipe(Exit.collectAllPar(results), Option.getOrElse(Exit.unit))
                ),
                new Exited(s.nextKey, ex, s.update)
              ] as const
            }
            case "ParallelN": {
              return [
                Effect.forEachPar(
                  Array.from(s.finalizers()).reverse(),
                  ([_, f]) => s.update(f)(ex).exit
                )
                  .flatMap((results) =>
                    pipe(Exit.collectAllPar(results), Option.getOrElse(Exit.unit))
                  )
                  .withParallelism(execStrategy.n) as Effect<never, never, unknown>,
                new Exited(s.nextKey, ex, s.update)
              ] as const
            }
          }
        }
      }
    })
    .flatten
}

// -----------------------------------------------------------------------------
// ReleaseMap
// -----------------------------------------------------------------------------

export function makeBoundedQueue<A>(
  requestedCapacity: number
): Effect<never, never, Queue<A>> {
  return Effect.sync(MutableQueue.bounded<A>(requestedCapacity)).flatMap((queue) =>
    createQueue(queue, new BackPressureStrategy())
  )
}

export function createQueue<A>(
  queue: MutableQueue.MutableQueue<A>,
  strategy: Strategy<A>
): Effect<never, never, Queue<A>> {
  return Deferred.make<never, void>().map((deferred) =>
    unsafeCreateQueue(
      queue,
      MutableQueue.unbounded(),
      deferred,
      MutableRef.make(false),
      strategy
    )
  )
}

class QueueImpl<A> implements Queue<A> {
  get [_In](): (_: A) => unknown {
    return (a) => a
  }

  get [QueueSym](): QueueSym {
    return QueueSym
  }

  get [_Out](): (_: never) => A {
    return (a) => a
  }

  constructor(
    readonly queue: MutableQueue.MutableQueue<A>,
    readonly takers: MutableQueue.MutableQueue<Deferred<never, A>>,
    readonly shutdownHook: Deferred<never, void>,
    readonly shutdownFlag: MutableRef.MutableRef<boolean>,
    readonly strategy: Strategy<A>
  ) {}

  offer(this: this, a: A): Effect<never, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return Effect.interrupt
      }
      let noRemaining: boolean
      if (MutableQueue.isEmpty(this.queue)) {
        const taker = pipe(
          this.takers,
          MutableQueue.poll(MutableQueue.EmptyMutableQueue)
        )
        if (taker !== MutableQueue.EmptyMutableQueue) {
          unsafeCompleteDeferred(taker, a)
          noRemaining = true
        } else {
          noRemaining = false
        }
      } else {
        noRemaining = false
      }
      if (noRemaining) {
        return Effect.succeed(true)
      }
      // Not enough takers, offer to the queue
      const succeeded = pipe(this.queue, MutableQueue.offer(a))
      unsafeCompleteTakers(
        this.strategy,
        this.queue,
        this.takers
      )
      return succeeded
        ? Effect.succeed(true)
        : this.strategy.handleSurplus(
          Chunk.single(a),
          this.queue,
          this.takers,
          this.shutdownFlag
        )
    })
  }

  offerAll(this: this, as: Iterable<A>): Effect<never, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return Effect.interrupt
      }
      const as0 = Chunk.fromIterable(as)
      const pTakers = MutableQueue.isEmpty(this.queue)
        ? Chunk.fromIterable(unsafePollN(this.takers, as0.length))
        : Chunk.empty
      const [forTakers, remaining] = pipe(as0, Chunk.splitAt(pTakers.length))
      pipe(
        pTakers,
        Chunk.zip(forTakers),
        Chunk.forEach(([taker, item]) => {
          unsafeCompleteDeferred(taker, item)
        })
      )
      if (Chunk.isEmpty(remaining)) {
        return Effect.succeed(true)
      }
      // Not enough takers, offer to the queue
      const surplus = unsafeOfferAll(this.queue, remaining)
      unsafeCompleteTakers(
        this.strategy,
        this.queue,
        this.takers
      )
      return List.isNil(surplus)
        ? Effect.succeed(true)
        : this.strategy.handleSurplus(
          Chunk.fromIterable(surplus),
          this.queue,
          this.takers,
          this.shutdownFlag
        )
    })
  }

  get capacity(): number {
    return MutableQueue.capacity(this.queue)
  }

  get size(): Effect<never, never, number> {
    return Effect.suspendSucceed(
      MutableRef.get(this.shutdownFlag)
        ? Effect.interrupt
        : Effect.succeed(
          MutableQueue.length(this.queue) -
            MutableQueue.length(this.takers) +
            this.strategy.surplusSize
        )
    )
  }

  get awaitShutdown(): Effect<never, never, void> {
    return this.shutdownHook.await
  }

  get isShutdown(): Effect<never, never, boolean> {
    return Effect.sync(MutableRef.get(this.shutdownFlag))
  }

  get shutdown(): Effect<never, never, void> {
    return Effect.withFiberRuntime<never, never, void>((state) => {
      pipe(this.shutdownFlag, MutableRef.set(true))
      return Effect.whenEffect(
        this.shutdownHook.succeed(undefined),
        Effect.forEachParDiscard(
          unsafePollAll(this.takers),
          (deferred) => deferred.interruptAs(state.id)
        ).zipRight(this.strategy.shutdown)
      ).unit
    }).uninterruptible
  }

  get isFull(): Effect<never, never, boolean> {
    return this.size.map((size) => size === this.capacity)
  }

  get isEmpty(): Effect<never, never, boolean> {
    return this.size.map((size) => size === 0)
  }

  get take(): Effect<never, never, A> {
    return Effect.withFiberRuntime((state) => {
      if (MutableRef.get(this.shutdownFlag)) {
        return Effect.interrupt
      }
      const item = pipe(this.queue, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (item !== MutableQueue.EmptyMutableQueue) {
        this.strategy.unsafeOnQueueEmptySpace(
          this.queue,
          this.takers
        )
        return Effect.succeed(item)
      } else {
        // Add the deferred to takers, then:
        // - Try to take again in case a value was added since
        // - Wait for the deferred to be completed
        // - Clean up resources in case of interruption
        const deferred = Deferred.unsafeMake<never, A>(state.id)
        return Effect.suspendSucceed(() => {
          pipe(this.takers, MutableQueue.offer(deferred))
          unsafeCompleteTakers(
            this.strategy,
            this.queue,
            this.takers
          )
          return MutableRef.get(this.shutdownFlag) ? Effect.interrupt : deferred.await
        }).onInterrupt(() => {
          return Effect.sync(
            unsafeRemove(this.takers, deferred)
          )
        })
      }
    })
  }

  get takeAll(): Effect<never, never, Chunk.Chunk<A>> {
    return Effect.suspendSucceed(() =>
      MutableRef.get(this.shutdownFlag)
        ? Effect.interrupt
        : Effect.sync(() => {
          const as = unsafePollAll(this.queue)
          this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
          return Chunk.fromIterable(as)
        })
    )
  }

  takeUpTo(this: this, max: number): Effect<never, never, Chunk.Chunk<A>> {
    return Effect.suspendSucceed(() =>
      MutableRef.get(this.shutdownFlag)
        ? Effect.interrupt
        : Effect.sync(() => {
          const as = unsafePollN(this.queue, max)
          this.strategy.unsafeOnQueueEmptySpace(
            this.queue,
            this.takers
          )
          return Chunk.fromIterable(as)
        })
    )
  }

  takeRemainderLoop<A>(
    self: Dequeue<A>,
    min: number,
    max: number,
    acc: Chunk.Chunk<A>
  ): Effect<never, never, Chunk.Chunk<A>> {
    if (max < min) {
      return Effect.succeed(acc)
    }
    return self.takeUpTo(max).flatMap((bs) => {
      const remaining = min - bs.length

      if (remaining === 1) {
        return self.take.map((b) => pipe(acc, Chunk.concat(bs), Chunk.append(b)))
      }

      if (remaining > 1) {
        return self.take.flatMap((b) =>
          this.takeRemainderLoop(
            self,
            remaining - 1,
            max - bs.length - 1,
            pipe(acc, Chunk.concat(bs), Chunk.append(b))
          )
        )
      }

      return Effect.succeed(pipe(acc, Chunk.concat(bs)))
    })
  }

  takeBetween(this: this, min: number, max: number): Effect<never, never, Chunk.Chunk<A>> {
    return Effect.suspendSucceed(this.takeRemainderLoop(this, min, max, Chunk.empty))
  }

  takeN(this: this, n: number): Effect<never, never, Chunk.Chunk<A>> {
    return this.takeBetween(n, n)
  }

  get poll(): Effect<never, never, Option.Option<A>> {
    return this.takeUpTo(1).map(Chunk.head)
  }
}

export function unsafeCreateQueue<A>(
  queue: MutableQueue.MutableQueue<A>,
  takers: MutableQueue.MutableQueue<Deferred<never, A>>,
  shutdownHook: Deferred<never, void>,
  shutdownFlag: MutableRef.MutableRef<boolean>,
  strategy: Strategy<A>
): Queue<A> {
  return new QueueImpl(queue, takers, shutdownHook, shutdownFlag, strategy)
}

export function makeBackPressureStrategy<A>() {
  return new BackPressureStrategy<A>()
}

export class BackPressureStrategy<A> implements Strategy<A> {
  /**
   * - `A` is an item to add
   * - `Deferred<never, boolean>` is the deferred completing the whole `offerAll`
   * - `boolean` indicates if it's the last item to offer (deferred should be
   *    completed once this item is added)
   */
  private putters = MutableQueue.unbounded<readonly [A, Deferred<never, boolean>, boolean]>()

  handleSurplus(
    as: Chunk.Chunk<A>,
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred<never, A>>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect<never, never, boolean> {
    return Effect.withFiberRuntime((state) => {
      const deferred = Deferred.unsafeMake<never, boolean>(state.id)

      return Effect.suspendSucceed(() => {
        this.unsafeOffer(as, deferred)
        this.unsafeOnQueueEmptySpace(queue, takers)
        unsafeCompleteTakers(this, queue, takers)
        return MutableRef.get(isShutdown) ? Effect.interrupt : deferred.await
      }).onInterrupt(() => Effect.sync(this.unsafeRemove(deferred)))
    })
  }

  unsafeRemove(deferred: Deferred<never, boolean>): void {
    unsafeOfferAll(
      this.putters,
      pipe(unsafePollAll(this.putters), List.filter(([, _]) => _ !== deferred))
    )
  }

  unsafeOffer(as: Chunk.Chunk<A>, deferred: Deferred<never, boolean>): void {
    let bs = as
    while (bs.length > 0) {
      const head = pipe(bs, Chunk.unsafeGet(0))
      bs = pipe(bs, Chunk.drop(1))
      if (bs.length === 0) {
        pipe(this.putters, MutableQueue.offer([head, deferred, true as boolean] as const))
      } else {
        pipe(this.putters, MutableQueue.offer([head, deferred, false as boolean] as const))
      }
    }
  }

  unsafeOnQueueEmptySpace(
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred<never, A>>
  ): void {
    let keepPolling = true
    while (keepPolling && !MutableQueue.isFull(queue)) {
      const putter = pipe(this.putters, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (putter !== MutableQueue.EmptyMutableQueue) {
        const offered = pipe(queue, MutableQueue.offer(putter[0]))
        if (offered && putter[2]) {
          unsafeCompleteDeferred(putter[1], true)
        } else if (!offered) {
          unsafeOfferAll(this.putters, pipe(unsafePollAll(this.putters), List.prepend(putter)))
        }
        unsafeCompleteTakers(this, queue, takers)
      } else {
        keepPolling = false
      }
    }
  }

  get surplusSize(): number {
    return MutableQueue.length(this.putters)
  }

  get shutdown(): Effect<never, never, void> {
    return Do(($) => {
      const fiberId = $(Effect.fiberId)
      const putters = $(Effect.sync(unsafePollAll(this.putters)))
      $(Effect.forEachPar(
        putters,
        ([_, promise, lastItem]) => lastItem ? promise.interruptAs(fiberId) : Effect.unit
      ))
    })
  }
}
