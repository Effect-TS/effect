import { Chunk } from "../../../collection/immutable/Chunk"
import * as Iter from "../../../collection/immutable/Iterable"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { AtomicBoolean } from "../../../support/AtomicBoolean"
import { AtomicNumber } from "../../../support/AtomicNumber"
import type { MutableQueue } from "../../../support/MutableQueue"
import { Bounded, Unbounded } from "../../../support/MutableQueue"
import { Cause } from "../../Cause"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import { Exit } from "../../Exit"
import type { Fiber } from "../../Fiber/definition"
import { interrupt as interruptFiber } from "../../Fiber/operations/interrupt"
import { FiberId } from "../../FiberId"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { Managed } from "../../Managed/definition"
import { ReleaseMap } from "../../Managed/ReleaseMap/definition"
import type { State } from "../../Managed/ReleaseMap/state"
import { Exited } from "../../Managed/ReleaseMap/state"
import { Promise } from "../../Promise/definition"
import type { Queue, Strategy } from "../../Queue/core"
import * as QCore from "../../Queue/core"
import { concreteQueue, XQueueInternal } from "../../Queue/xqueue"
import * as RefModify from "../../Ref/operations/modify"
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
export function forEach_<A, R, E, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(() => {
    const acc: B[] = []
    return forEachDiscard_(as, (a) =>
      f(a).map((b) => {
        acc.push(b)
      })
    ).map(() => Chunk.from(acc))
  })
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `Chunk<B>`.
 *
 * For a parallel version of this method, see `forEachPar`. If you do not need
 * the results, see `forEachUnit` for a more efficient implementation.
 *
 * @ets_data_first forEach_
 */
export function forEach<A, R, E, B>(f: (a: A) => Effect<R, E, B>, __etsTrace?: string) {
  return (as: Iterable<A>) => forEach_(as, f)
}

// -----------------------------------------------------------------------------
// forEachWithIndex
// -----------------------------------------------------------------------------

/**
 * Same as `forEach_`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @tsplus static ets/EffectOps forEachWithIndex
 */
export function forEachWithIndex_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(() => {
    let index = 0
    const acc: B[] = []
    return forEachDiscard_(as, (a) =>
      f(a, index).map((b) => {
        acc.push(b)
        index++
      })
    ).map(() => Chunk.from(acc))
  })
}

/**
 * Same as `forEach`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @ets_data_first forEachWithIndex_
 */
export function forEachWithIndex<A, R, E, B>(
  f: (a: A, i: number) => Effect<R, E, B>,
  __etsTrace?: string
) {
  return (as: Iterable<A>) => forEachWithIndex_(as, f)
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
export function forEachDiscard_<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, X>,
  __etsTrace?: string
): Effect<R, E, void> {
  return Effect.suspendSucceed(() => forEachDiscardLoop(as()[Symbol.iterator](), f))
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @ets_data_first forEachDiscard_
 */
export function forEachDiscard<R, E, A, X>(
  f: (a: A) => Effect<R, E, X>,
  __etsTrace?: string
): (as: Iterable<A>) => Effect<R, E, void> {
  return (as) => forEachDiscard_(as, f)
}

function forEachDiscardLoop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  const next = iterator.next()
  return next.done
    ? Effect.unit
    : f(next.value).flatMap(() => forEachDiscardLoop(iterator, f))
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
export function forEachPar_<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.parallelismWith((_) =>
    _.fold(
      () => forEachParUnbounded(as, f),
      (n) => forEachParN(as, n, f)
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets_data_first forEachPar_
 */
export function forEachPar<R, E, A, B>(
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Effect<R, E, Chunk<B>> => forEachPar_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 */
function forEachParUnbounded<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(() =>
    Effect.succeed<B[]>([]).flatMap((array) =>
      forEachParUnboundedDiscard(
        Iter.map_(as(), (a, n) => [a, n] as [A, number]),
        ([a, n]) =>
          Effect.suspendSucceed(() => f(a)).flatMap((b) =>
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
  __etsTrace?: string
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
        .takeUpTo(1)
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
        QCore.offerAll_(queue, as0.zipWithIndex()).flatMap(() =>
          collectAllParUnboundedDiscard(worker(queue, array).replicate(n)).map(() =>
            Chunk.from(array)
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
export function forEachParWithIndex_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(() =>
    Effect.succeed<B[]>(() => []).flatMap((array) =>
      forEachParDiscard_(
        Iter.map_(as, (a, n) => [a, n] as [A, number]),
        ([a, n]) =>
          Effect.suspendSucceed(() => f(a, n)).flatMap((b) =>
            Effect.succeed(() => {
              array[n] = b
            })
          )
      ).map(() => Chunk.from(array))
    )
  )
}

/**
 * Same as `forEachPar`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 */
export function forEachParWithIndex<R, E, A, B>(
  f: (a: A, i: number) => Effect<R, E, B>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Effect<R, E, Chunk<B>> => forEachParWithIndex_(as, f)
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
export function forEachParDiscard_<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, X>,
  __etsTrace?: string
): Effect<R, E, void> {
  return Effect.parallelismWith((_) =>
    _.fold(
      () => forEachParUnboundedDiscard(as, f),
      (n) => forEachParNDiscard(as, n, f)
    )
  )
}

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
 * @ets_data_first forEachParDiscard_
 */
export function forEachParDiscard<R, E, A, X>(
  f: (a: A) => Effect<R, E, X>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Effect<R, E, void> => forEachParDiscard_(as, f)
}

function forEachParUnboundedDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, X>,
  __etsTrace?: string
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
        forEach_(as, (a) =>
          graft(
            restore(Effect.suspendSucceed(() => f(a))).foldCauseEffect(
              (cause) => promise.fail(undefined).zipRight(Effect.failCauseNow(cause)),
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
            forEachParUnbounded(fibers, interruptFiber).flatMap((exits) => {
              const collected = Exit.collectAllPar(exits)
              if (collected._tag === "Some" && collected.value._tag === "Failure") {
                return Effect.failCauseNow(
                  Cause.both(cause.stripFailures(), collected.value.cause)
                )
              }
              return Effect.failCauseNow(cause.stripFailures())
            }),
          (_) => forEachDiscard_(fibers, (_) => _.inheritRefs)
        )
      )
    })
  })
}

function forEachParNDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  n: number,
  f: (a: A) => Effect<R, E, X>,
  __etsTrace?: string
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
        .takeUpTo(1)
        .map((_) => _.head)
        .flatMap((_) =>
          _.fold(
            () => Effect.unit,
            (a) => f(a).flatMap(() => worker(queue))
          )
        )
    }

    return makeBoundedQueue<A>(size).flatMap((queue) =>
      QCore.offerAll_(queue, as0).flatMap(() =>
        collectAllParUnboundedDiscard(worker(queue).replicate(n))
      )
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
export function forEachExec_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  strategy: ExecutionStrategy,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.suspendSucceed(() => {
    switch (strategy._tag) {
      case "Parallel": {
        return forEachPar_(as, f).withParallelismUnbounded()
      }
      case "ParallelN": {
        return forEachPar_(as, f).withParallelism(strategy.n)
      }
      case "Sequential": {
        return forEach_(as, f)
      }
    }
  })
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and returns
 * the result in a new `Chunk<B>` using the specified execution strategy.
 *
 * @ets_data_first forEachExec_
 */
export function forEachExec<R, E, A, B>(
  f: (a: A) => Effect<R, E, B>,
  strategy: ExecutionStrategy,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Effect<R, E, Chunk<B>> => forEachExec_(as, f, strategy)
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
  as: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
) {
  return forEach_(as, identity)
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
  as: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, E, Chunk<A>> {
  return forEachPar_(as, identity)
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
  as: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, E, void> {
  return forEachDiscard_(as, identity)
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
  as: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, E, void> {
  return forEachParDiscard_(as, identity)
}

// -----------------------------------------------------------------------------
// collectAllParUnboundedDiscard
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllDiscard`.
 *
 * @tsplus static ets/EffectOps collectAllParUnboundedDiscard
 */
export function collectAllParUnboundedDiscard<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, E, void> {
  return forEachParUnboundedDiscard(as, identity)
}

// -----------------------------------------------------------------------------
// collectAllParNDiscard
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllDiscard`.
 *
 * Unlike `collectAllParDiscard`, this method will use at most `n` fibers.
 *
 * @tsplus static ets/EffectOps collectAllParNDiscard
 */
export function collectAllParNDiscard_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  __etsTrace?: string
): Effect<R, E, void> {
  return forEachParNDiscard(as, n, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllDiscard`.
 *
 * Unlike `collectAllParDiscard`, this method will use at most `n` fibers.
 *
 * @ets_data_first collectAllParNDiscard_
 */
export function collectAllParNDiscard(n: number, __etsTrace?: string) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>): Effect<R, E, void> =>
    collectAllParNDiscard_(as, n)
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
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => Option<B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return collectAll(as).map((_) => _.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => Option<B>, __etsTrace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, Chunk<B>> =>
    collectAllWith_(as, pf)
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
export function collectAllWithPar_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => Option<B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return collectAllPar(as).map((_) => _.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWithPar_
 */
export function collectAllWithPar<A, B>(pf: (a: A) => Option<B>, __etsTrace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, Chunk<B>> =>
    collectAllWithPar_(as, pf)
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
  as: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, never, Chunk<A>> {
  return collectAllWith_(
    Iter.map_(as, (_) => _.exit()),
    (e) => (e._tag === "Success" ? Option.some(e.value) : Option.none)
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
  as: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, never, Chunk<A>> {
  return collectAllWithPar_(
    Iter.map_(as, (_) => _.exit()),
    (e) => (e._tag === "Success" ? Option.some(e.value) : Option.none)
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
  as: Iterable<Fiber<E, A>>,
  __etsTrace?: string
): Effect<unknown, E, Chunk<A>> {
  return fiberWaitAll(as)
    .flatMap((exit) => Effect.done(exit))
    .tap(() => forEach_(as, (f) => f.inheritRefs))
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function fiberWaitAll<E, A>(
  as: Iterable<Fiber<E, A>>,
  __etsTrace?: string
): RIO<unknown, Exit<E, Chunk<A>>> {
  return forEachPar_(as, (f) => f.await.flatMap((exit) => Effect.done(exit))).exit()
}

// -----------------------------------------------------------------------------
// ReleaseMap
// -----------------------------------------------------------------------------

/**
 * Releases all the finalizers in the releaseMap according to the ExecutionStrategy.
 */
export function releaseMapReleaseAll_(
  self: ReleaseMap,
  ex: Exit<any, any>,
  execStrategy: ExecutionStrategy,
  __etsTrace?: string
): UIO<any> {
  return RefModify.modify_(self.ref, (s): Tuple<[UIO<any>, State]> => {
    switch (s._tag) {
      case "Exited": {
        return Tuple(Effect.unit, s)
      }
      case "Running": {
        switch (execStrategy._tag) {
          case "Sequential": {
            return Tuple(
              forEach_(Array.from(s.finalizers()).reverse(), ([_, f]) =>
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
              forEachPar_(Array.from(s.finalizers()).reverse(), ([_, f]) =>
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
              forEachPar_(Array.from(s.finalizers()).reverse(), ([_, f]) =>
                s.update(f)(ex).exit()
              )
                .flatMap((results) =>
                  // @ts-expect-error
                  Effect.done(Exit.collectAllPar(results).getOrElse(Exit.unit))
                )
                .withParallelism(execStrategy.n) as UIO<any>,
              new Exited(s.nextKey, ex, s.update)
            )
          }
        }
      }
    }
  }).flatten()
}

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 */
export function managedFork<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, never, Fiber<E, A>> {
  return Managed(
    Effect.uninterruptibleMask(({ restore }) =>
      Effect.Do()
        .bind("outerReleaseMap", () => fiberRefGet(currentReleaseMap.value))
        .bind("innerReleaseMap", () => ReleaseMap.make)
        .bind("fiber", ({ innerReleaseMap }) =>
          locally_(
            currentReleaseMap.value,
            innerReleaseMap
          )(
            restore(self.effect.map((_) => _.get(1))).forkDaemon() as RIO<
              R,
              Fiber<E, A>
            >
          )
        )
        .bind("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          outerReleaseMap.add((e) =>
            interruptFiber(fiber).flatMap(() =>
              releaseMapReleaseAll_(innerReleaseMap, e, ExecutionStrategy.Sequential)
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
export function managedUse_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => Effect<R2, E2, B>,
  __etsTrace?: string
): Effect<R & R2, E | E2, B> {
  return ReleaseMap.make.flatMap((releaseMap) =>
    locally_(
      currentReleaseMap.value,
      releaseMap
    )(
      fiberRefGet(currentReleaseMap.value).acquireReleaseExitWith(
        () => self.effect.flatMap((_) => f(_.get(1))),
        (relMap, ex) => releaseMapReleaseAll_(relMap, ex, ExecutionStrategy.Sequential)
      )
    )
  )
}

// -----------------------------------------------------------------------------
// Queue
// -----------------------------------------------------------------------------

export class BackPressureStrategy<A> implements Strategy<A> {
  private putters = new Unbounded<Tuple<[A, Promise<never, boolean>, boolean]>>()

  handleSurplus(
    as: Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean
  ): UIO<boolean> {
    return Effect.suspendSucceedWith((_, fiberId) => {
      const promise = Promise.unsafeMake<never, boolean>(fiberId)

      return Effect.suspendSucceed(() => {
        this.unsafeOffer(as, promise)
        this.unsafeOnQueueEmptySpace(queue, takers)
        QCore.unsafeCompleteTakers(this, queue, takers)
        if (isShutdown.get) {
          return Effect.interrupt
        } else {
          return promise.await()
        }
      }).onInterrupt(() => Effect.succeed(() => this.unsafeRemove(promise)))
    })
  }

  unsafeRemove(promise: Promise<never, boolean>) {
    QCore.unsafeOfferAll(
      this.putters,
      QCore.unsafePollAll(this.putters).filter(([_, __]) => __ !== promise)
    )
  }

  unsafeOffer(as: Chunk<A>, promise: Promise<never, boolean>) {
    let bs = as

    while (bs.size > 0) {
      const head = bs.unsafeGet(0)!

      bs = bs.drop(1)

      if (bs.size === 0) {
        this.putters.offer(Tuple(head, promise, true))
        return
      } else {
        this.putters.offer(Tuple(head, promise, false))
      }
    }
  }

  unsafeOnQueueEmptySpace(
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>
  ) {
    let keepPolling = true

    while (keepPolling && !queue.isFull) {
      const putter = this.putters.poll(undefined)

      if (putter != null) {
        const offered = queue.offer(putter.get(0))

        if (offered && putter.get(2)) {
          QCore.unsafeCompletePromise(putter.get(1), true)
        } else if (!offered) {
          QCore.unsafeOfferAll(
            this.putters,
            QCore.unsafePollAll(this.putters).prepend(putter)
          )
        }
        QCore.unsafeCompleteTakers(this, queue, takers)
      } else {
        keepPolling = false
      }
    }
  }

  get shutdown(): UIO<void> {
    return Effect.Do()
      .bind("fiberId", () => Effect.fiberId)
      .bind("putters", () => Effect.succeed(() => QCore.unsafePollAll(this.putters)))
      .tap(({ fiberId, putters }) =>
        forEachPar_(putters, ({ tuple: [_, promise, lastItem] }) =>
          lastItem ? promise.interruptAs(fiberId) : Effect.unit
        )
      )
      .asUnit()
  }

  get surplusSize(): number {
    return this.putters.size
  }
}

/**
 * Creates a bounded queue
 */
export function makeBoundedQueue<A>(
  capacity: number,
  __etsTrace?: string
): UIO<Queue<A>> {
  return Effect.succeed(() => new Bounded<A>(capacity)).flatMap((x) =>
    createQueue_(x, new BackPressureStrategy())
  )
}

/**
 * Unsafely creates a queue
 */
export function unsafeCreateQueue<A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Queue<A> {
  return new UnsafeCreate(queue, takers, shutdownHook, shutdownFlag, strategy)
}

class UnsafeCreate<A> extends XQueueInternal<unknown, unknown, never, never, A, A> {
  constructor(
    readonly queue: MutableQueue<A>,
    readonly takers: MutableQueue<Promise<never, A>>,
    readonly shutdownHook: Promise<never, void>,
    readonly shutdownFlag: AtomicBoolean,
    readonly strategy: Strategy<A>
  ) {
    super()
  }

  awaitShutdown: UIO<void> = this.shutdownHook.await()

  capacity: number = this.queue.capacity

  isShutdown: UIO<boolean> = Effect.succeed(() => this.shutdownFlag.get)

  offer(a: A): Effect<unknown, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      } else {
        const noRemaining = (() => {
          if (this.queue.isEmpty) {
            const taker = this.takers.poll(undefined)

            if (!taker) {
              return false
            } else {
              QCore.unsafeCompletePromise(taker, a)
              return true
            }
          } else {
            return false
          }
        })()

        if (noRemaining) {
          return Effect.succeedNow(true)
        }
        const succeeded = this.queue.offer(a)

        QCore.unsafeCompleteTakers(this.strategy, this.queue, this.takers)

        if (succeeded) {
          return Effect.succeedNow(true)
        } else {
          return this.strategy.handleSurplus(
            Chunk.single(a),
            this.queue,
            this.takers,
            this.shutdownFlag
          )
        }
      }
    })
  }

  offerAll(as: Iterable<A>): Effect<unknown, never, boolean> {
    const arr = Chunk.from(as)
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      } else {
        const pTakers = this.queue.isEmpty
          ? QCore.unsafePollN(this.takers, arr.size)
          : Chunk.empty<Promise<never, A>>()
        const {
          tuple: [forTakers, remaining]
        } = arr.splitAt(pTakers.size)

        pTakers.zip(forTakers).forEach(({ tuple: [taker, item] }) => {
          QCore.unsafeCompletePromise(taker, item)
        })

        if (remaining.size === 0) {
          return Effect.succeedNow(true)
        }

        const surplus = QCore.unsafeOfferAll(this.queue, remaining)

        QCore.unsafeCompleteTakers(this.strategy, this.queue, this.takers)

        if (surplus.size === 0) {
          return Effect.succeedNow(true)
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

  shutdown: UIO<void> = Effect.suspendSucceedWith((_, fiberId) => {
    this.shutdownFlag.set(true)
    return Effect.forEachPar(QCore.unsafePollAll(this.takers), (promise) =>
      promise.interruptAs(fiberId)
    )
      .flatMap(() => this.strategy.shutdown)
      .whenEffect(this.shutdownHook.succeed(undefined))
  }).uninterruptible()

  size: UIO<number> = Effect.suspendSucceed(() => {
    if (this.shutdownFlag.get) {
      return Effect.interrupt
    } else {
      return Effect.succeedNow(
        this.queue.size - this.takers.size + this.strategy.surplusSize
      )
    }
  })

  take: Effect<unknown, never, A> = Effect.suspendSucceedWith((_, fiberId) => {
    if (this.shutdownFlag.get) {
      return Effect.interrupt
    }

    const item = this.queue.poll(undefined)

    if (item) {
      this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
      return Effect.succeedNow(item)
    } else {
      const promise = Promise.unsafeMake<never, A>(fiberId)

      return Effect.suspendSucceed(() => {
        this.takers.offer(promise)
        QCore.unsafeCompleteTakers(this.strategy, this.queue, this.takers)
        if (this.shutdownFlag.get) {
          return Effect.interrupt
        } else {
          return promise.await()
        }
      }).onInterrupt(() =>
        Effect.succeed(() => QCore.unsafeRemove(this.takers, promise))
      )
    }
  })

  takeAll: Effect<unknown, never, Chunk<A>> = Effect.suspendSucceed(() => {
    if (this.shutdownFlag.get) {
      return Effect.interrupt
    } else {
      return Effect.succeed(() => {
        const as = QCore.unsafePollAll(this.queue)
        this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
        return as
      })
    }
  })

  takeUpTo(n: number): Effect<unknown, never, Chunk<A>> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      } else {
        return Effect.succeed(() => {
          const as = QCore.unsafePollN(this.queue, n)
          this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
          return as
        })
      }
    })
  }
}

/**
 * Creates a queue
 */
export function createQueue_<A>(
  queue: MutableQueue<A>,
  strategy: Strategy<A>,
  __etsTrace?: string
) {
  return Promise.make<never, void>().map((promise) =>
    unsafeCreateQueue(
      queue,
      new Unbounded(),
      promise,
      new AtomicBoolean(false),
      strategy
    )
  )
}

/**
 * Creates a queue
 *
 * @ets_data_first createQueue_
 */
export function createQueue<A>(strategy: Strategy<A>, __etsTrace?: string) {
  return (queue: MutableQueue<A>) => createQueue_(queue, strategy)
}
