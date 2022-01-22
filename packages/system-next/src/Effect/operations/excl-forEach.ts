import * as Cause from "../../Cause"
import * as ChunkCollect from "../../Collections/Immutable/Chunk/api/collect"
import * as ChunkFilter from "../../Collections/Immutable/Chunk/api/filter"
import * as ChunkForEach from "../../Collections/Immutable/Chunk/api/forEach"
import * as ChunkSplitAt from "../../Collections/Immutable/Chunk/api/splitAt"
import * as ChunkZip from "../../Collections/Immutable/Chunk/api/zip"
import * as ChunkZipWithIndex from "../../Collections/Immutable/Chunk/api/zipWithIndex"
import * as Chunk from "../../Collections/Immutable/Chunk/core"
import * as List from "../../Collections/Immutable/List/core"
import * as Tp from "../../Collections/Immutable/Tuple"
import type { Exit } from "../../Exit"
import { collectAll as exitCollectAll } from "../../Exit/operations/collectAll"
import { collectAllPar as exitCollectAllPar } from "../../Exit/operations/collectAllPar"
import { succeed as exitSucceed } from "../../Exit/operations/succeed"
import type { FiberContext } from "../../Fiber/context"
import type { Fiber } from "../../Fiber/definition"
import { interrupt as interruptFiber } from "../../Fiber/operations/interrupt"
import * as FiberIdNone from "../../FiberId/operations/none"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { identity, pipe } from "../../Function"
import * as Iter from "../../Iterable"
import type { Managed } from "../../Managed/definition"
import { managedApply } from "../../Managed/definition"
import { add_ as releaseMapAdd_ } from "../../Managed/ReleaseMap/add"
import type { ReleaseMap } from "../../Managed/ReleaseMap/definition"
import { make as releaseMapMake } from "../../Managed/ReleaseMap/make"
import type { State } from "../../Managed/ReleaseMap/state"
import { Exited } from "../../Managed/ReleaseMap/state"
import * as O from "../../Option"
import type { Promise } from "../../Promise/definition"
import { await as promiseAwait } from "../../Promise/operations/await"
import { fail_ } from "../../Promise/operations/fail"
import { interruptAs } from "../../Promise/operations/interruptAs"
import { make } from "../../Promise/operations/make"
import { succeed as succeed_1 } from "../../Promise/operations/succeed"
import { unsafeDone_ } from "../../Promise/operations/unsafeDone"
import { unsafeMake } from "../../Promise/operations/unsafeMake"
import type { Queue, Strategy } from "../../Queue/core"
import * as QCore from "../../Queue/core"
import { concreteQueue, XQueueInternal } from "../../Queue/xqueue"
import { AtomicBoolean } from "../../Support/AtomicBoolean"
import { AtomicNumber } from "../../Support/AtomicNumber"
import type { MutableQueue } from "../../Support/MutableQueue"
import { Bounded, Unbounded } from "../../Support/MutableQueue"
import type { Effect, RIO, UIO } from "../definition"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"
import { asUnit } from "./asUnit"
import { chain, chain_ } from "./chain"
import { dieMessage } from "./dieMessage"
import * as Do from "./do"
import { done } from "./done"
import * as Ref from "./excl-deps-ref"
import type { ExecutionStrategy } from "./ExecutionStrategy"
import { sequential } from "./ExecutionStrategy"
import { exit } from "./exit"
import { failCause } from "./failCause"
import { fiberId } from "./fiberId"
import { flatten } from "./flatten"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { forkDaemon } from "./forkDaemon"
import {
  interrupt,
  onInterrupt_,
  uninterruptible,
  uninterruptibleMask
} from "./interruption"
import { map, map_ } from "./map"
import {
  parallelismWith,
  withParallelism_,
  withParallelismUnbounded
} from "./parallelism"
import { replicate_ } from "./replicate"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"
import { suspendSucceedWith } from "./suspendSucceedWith"
import { tap, tap_ } from "./tap"
import { transplant } from "./transplant"
import { unit } from "./unit"
import { whenEffect } from "./whenEffect"
import { zipRight_ } from "./zipRight"

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
 * @ets static ets/EffectOps forEach
 */
export function forEach_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return suspendSucceed(() => {
    const acc: B[] = []

    return map_(
      forEachDiscard_(as, (a) =>
        map_(f(a), (b) => {
          acc.push(b)
        })
      ),
      () => Chunk.from(acc)
    )
  }, __trace)
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
export function forEach<A, R, E, B>(f: (a: A) => Effect<R, E, B>, __trace?: string) {
  return (as: Iterable<A>) => forEach_(as, f, __trace)
}

// -----------------------------------------------------------------------------
// forEachWithIndex
// -----------------------------------------------------------------------------

/**
 * Same as `forEach_`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @ets static ets/EffectOps forEachWithIndex
 */
export function forEachWithIndex_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return suspendSucceed(() => {
    let index = 0
    const acc: B[] = []

    return map_(
      forEachDiscard_(as, (a) =>
        map_(f(a, index), (b) => {
          acc.push(b)
          index++
        })
      ),
      () => Chunk.from(acc)
    )
  }, __trace)
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
  __trace?: string
) {
  return (as: Iterable<A>) => forEachWithIndex_(as, f, __trace)
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
 * @ets static ets/EffectOps forEachDiscard
 */
export function forEachDiscard_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  return suspendSucceed(() => forEachDiscardLoop(as[Symbol.iterator](), f), __trace)
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
  __trace?: string
): (as: Iterable<A>) => Effect<R, E, void> {
  return (as) => forEachDiscard_(as, f, __trace)
}

function forEachDiscardLoop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  const next = iterator.next()
  return next.done ? unit : chain_(f(next.value), () => forEachDiscardLoop(iterator, f))
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
 * @ets static ets/EffectOps forEachPar
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return parallelismWith(
    O.fold(
      () => forEachParUnbounded(as, f),
      (n) => forEachParN(as, n, f)
    ),
    __trace
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
export function forEachPar<R, E, A, B>(f: (a: A) => Effect<R, E, B>, __trace?: string) {
  return (as: Iterable<A>): Effect<R, E, Chunk.Chunk<B>> => forEachPar_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 */
function forEachParUnbounded<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return suspendSucceed(
    () =>
      chain_(
        succeed<B[]>(() => []),
        (array) =>
          map_(
            forEachParUnboundedDiscard(
              Iter.map_(as, (a, n) => [a, n] as [A, number]),
              ([a, n]) =>
                chain_(
                  suspendSucceed(() => f(a)),
                  (b) =>
                    succeed(() => {
                      array[n] = b
                    })
                )
            ),
            () => Chunk.from(array)
          )
      ),
    __trace
  )
}

function forEachParN<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return suspendSucceed(() => {
    if (n < 1) {
      return dieMessage(`Unexpected nonpositive value "${n}" passed to foreachParN`)
    }

    const as0 = Chunk.from(as)
    const size = Chunk.size(as0)

    if (size === 0) {
      return succeedNow(Chunk.empty(), __trace)
    }

    function worker(
      queue: Queue<Tp.Tuple<[A, number]>>,
      array: Array<B>
    ): Effect<R, E, void> {
      concreteQueue(queue)
      return chain_(
        map_(queue.takeUpTo(1), Chunk.head),
        O.fold(
          () => unit,
          ({ tuple: [a, n] }) =>
            chain_(
              tap_(f(a), (b) =>
                succeed(() => {
                  array[n] = b
                })
              ),
              () => worker(queue, array)
            )
        )
      )
    }

    return chain_(
      succeed(() => new Array<B>(size)),
      (array) =>
        chain_(makeBoundedQueue<Tp.Tuple<[A, number]>>(size), (queue) =>
          chain_(QCore.offerAll_(queue, ChunkZipWithIndex.zipWithIndex(as0)), () =>
            map_(
              collectAllParUnboundedDiscard(replicate_(worker(queue, array), n)),
              () => Chunk.from(array)
            )
          )
        )
    )
  }, __trace)
}

// -----------------------------------------------------------------------------
// forEachParWithIndex
// -----------------------------------------------------------------------------

/**
 * Same as `forEachPar_`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @ets static ets/EffectOps forEachParWithIndex
 */
export function forEachParWithIndex_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return suspendSucceed(
    () =>
      chain_(
        succeed<B[]>(() => []),
        (array) =>
          map_(
            forEachParDiscard_(
              Iter.map_(as, (a, n) => [a, n] as [A, number]),
              ([a, n]) =>
                chain_(
                  suspendSucceed(() => f(a, n)),
                  (b) =>
                    succeed(() => {
                      array[n] = b
                    })
                )
            ),
            () => Chunk.from(array)
          )
      ),
    __trace
  )
}

/**
 * Same as `forEachPar`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 */
export function forEachParWithIndex<R, E, A, B>(
  f: (a: A, i: number) => Effect<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>): Effect<R, E, Chunk.Chunk<B>> =>
    forEachParWithIndex_(as, f, __trace)
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
 * @ets static ets/EffectOps forEachParDiscard
 */
export function forEachParDiscard_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  return parallelismWith(
    O.fold(
      () => forEachParUnboundedDiscard(as, f),
      (n) => forEachParNDiscard(as, n, f)
    ),
    __trace
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
  __trace?: string
) {
  return (as: Iterable<A>): Effect<R, E, void> => forEachParDiscard_(as, f, __trace)
}

function forEachParUnboundedDiscard<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  return suspendSucceed<R, E, void>(() => {
    const bs = Chunk.from(as)
    const size = Chunk.size(bs)

    if (size === 0) {
      return unit
    }

    return uninterruptibleMask((status) => {
      const promise = unsafeMake<void, void>(FiberIdNone.none)
      const ref = new AtomicNumber(0)

      return pipe(
        transplant((graft) =>
          forEach_(as, (a) =>
            forkDaemon(
              graft(
                foldCauseEffect_(
                  status.restore(suspendSucceed(() => f(a))),
                  (cause) => zipRight_(fail_(promise, undefined), failCause(cause)),
                  () => {
                    if (ref.incrementAndGet() === size) {
                      unsafeDone_(promise, unit)
                      return unit
                    } else {
                      return unit
                    }
                  }
                ),
                __trace
              )
            )
          )
        ),
        chain((fibers) =>
          foldCauseEffect_(
            status.restore(promiseAwait(promise)),
            (cause) =>
              chain_(forEachParUnbounded(fibers, interruptFiber), (exits) => {
                const collected = exitCollectAllPar(exits)
                if (collected._tag === "Some" && collected.value._tag === "Failure") {
                  return failCause(
                    Cause.both(Cause.stripFailures(cause), collected.value.cause)
                  )
                }
                return failCause(Cause.stripFailures(cause))
              }),
            (_) => forEachDiscard_(fibers, (_) => _.inheritRefs)
          )
        )
      )
    })
  })
}

function forEachParNDiscard<R, E, A, X>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  return suspendSucceed(() => {
    const bs = Chunk.from(as)
    const size = Chunk.size(bs)

    if (size === 0) {
      return unit
    } else {
      // eslint-disable-next-line no-inner-declarations
      function worker(queue: Queue<A>): Effect<R, E, void> {
        concreteQueue(queue)
        return chain_(
          map_(queue.takeUpTo(1), Chunk.head),
          O.fold(
            () => unit,
            (a) => chain_(f(a), () => suspendSucceed(() => worker(queue)))
          )
        )
      }

      return chain_(makeBoundedQueue<A>(size), (queue) =>
        chain_(QCore.offerAll_(queue, as), () =>
          collectAllParUnboundedDiscard(replicate_(worker(queue), n))
        )
      )
    }
  }, __trace)
}

// -----------------------------------------------------------------------------
// forEachExec
// -----------------------------------------------------------------------------

/**
 * Applies the function `f` to each element of the `Iterable<A>` and returns
 * the result in a new `Chunk<B>` using the specified execution strategy.
 *
 * @ets static ets/EffectOps forEachExec
 */
export function forEachExec_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  strategy: ExecutionStrategy,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return suspendSucceed(() => {
    switch (strategy._tag) {
      case "Parallel": {
        return withParallelismUnbounded(forEachPar_(as, f, __trace))
      }
      case "ParallelN": {
        return withParallelism_(forEachPar_(as, f, __trace), strategy.n)
      }
      case "Sequential": {
        return forEach_(as, f, __trace)
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
  __trace?: string
) {
  return (as: Iterable<A>): Effect<R, E, Chunk.Chunk<B>> =>
    forEachExec_(as, f, strategy, __trace)
}

// -----------------------------------------------------------------------------
// collectAll
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 *
 * @ets static ets/EffectOps collectAll
 */
export function collectAll<R, E, A>(as: Iterable<Effect<R, E, A>>, __trace?: string) {
  return forEach_(as, identity, __trace)
}

// -----------------------------------------------------------------------------
// collectAllPar
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * @ets static ets/EffectOps collectAllPar
 */
export function collectAllPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<A>> {
  return forEachPar_(as, identity, __trace)
}

// -----------------------------------------------------------------------------
// collectAllDiscard
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllParDiscard`.
 *
 * @ets static ets/EffectOps collectAllDiscard
 */
export function collectAllDiscard<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, void> {
  return forEachDiscard_(as, identity, __trace)
}

// -----------------------------------------------------------------------------
// collectAllParDiscard
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllDiscard`.
 *
 * @ets static ets/EffectOps collectAllParDiscard
 */
export function collectAllParDiscard<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, void> {
  return forEachParDiscard_(as, identity, __trace)
}

// -----------------------------------------------------------------------------
// collectAllParUnboundedDiscard
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllDiscard`.
 *
 * @ets static ets/EffectOps collectAllParUnboundedDiscard
 */
export function collectAllParUnboundedDiscard<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, void> {
  return forEachParUnboundedDiscard(as, identity, __trace)
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
 * @ets static ets/EffectOps collectAllParNDiscard
 */
export function collectAllParNDiscard_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  __trace?: string
): Effect<R, E, void> {
  return forEachParNDiscard(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllDiscard`.
 *
 * Unlike `collectAllParDiscard`, this method will use at most `n` fibers.
 *
 * @ets_data_first collectAllParNDiscard_
 */
export function collectAllParNDiscard(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>): Effect<R, E, void> =>
    collectAllParNDiscard_(as, n, __trace)
}

// -----------------------------------------------------------------------------
// collectAllWith
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets static ets/EffectOps collectAllWith
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return map_(collectAll(as, __trace), ChunkCollect.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, Chunk.Chunk<B>> =>
    collectAllWith_(as, pf, __trace)
}

// -----------------------------------------------------------------------------
// collectAllWithPar
// -----------------------------------------------------------------------------

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets static ets/EffectOps collectAllWithPar
 */
export function collectAllWithPar_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return map_(collectAllPar(as, __trace), ChunkCollect.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWithPar_
 */
export function collectAllWithPar<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, Chunk.Chunk<B>> =>
    collectAllWithPar_(as, pf, __trace)
}

// -----------------------------------------------------------------------------
// collectAllSuccesses
// -----------------------------------------------------------------------------

/**
 * Evaluate and run each effect in the structure and collect discarding failed ones.
 *
 * @ets static ets/EffectOps collectAllSuccesses
 */
export function collectAllSuccesses<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
): Effect<R, never, Chunk.Chunk<A>> {
  return collectAllWith_(
    Iter.map_(as, (x) => exit(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

// -----------------------------------------------------------------------------
// collectAllSuccessesPar
// -----------------------------------------------------------------------------

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * @ets static ets/EffectOps collectAllSuccessesPar
 */
export function collectAllSuccessesPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
): Effect<R, never, Chunk.Chunk<A>> {
  return collectAllWithPar_(
    Iter.map_(as, (x) => exit(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
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
  __trace?: string
): Effect<unknown, E, Chunk.Chunk<A>> {
  return tap_(
    chain_(fiberWaitAll(as), done),
    () => forEach_(as, (f) => f.inheritRefs),
    __trace
  )
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function fiberWaitAll<E, A>(
  as: Iterable<Fiber<E, A>>,
  __trace?: string
): RIO<unknown, Exit<E, Chunk.Chunk<A>>> {
  return exit(
    forEachPar_(as, (f) => chain_(f.await, done)),
    __trace
  )
}

// -----------------------------------------------------------------------------
// ReleaseMap
// -----------------------------------------------------------------------------

/**
 * Releases all the finalizers in the releaseMap according to the ExecutionStrategy
 */
export function releaseMapReleaseAll_(
  self: ReleaseMap,
  ex: Exit<any, any>,
  execStrategy: ExecutionStrategy,
  __trace?: string
): UIO<any> {
  return pipe(
    self.ref,
    Ref.modify((s): Tp.Tuple<[UIO<any>, State]> => {
      switch (s._tag) {
        case "Exited": {
          return Tp.tuple(unit, s)
        }
        case "Running": {
          switch (execStrategy._tag) {
            case "Sequential": {
              return Tp.tuple(
                chain_(
                  forEach_(
                    Array.from(s.finalizers()).reverse(),
                    ([_, f]) => exit(s.update(f)(ex)),
                    __trace
                  ),
                  (results) =>
                    done(
                      O.getOrElse_(exitCollectAll(results), () =>
                        exitSucceed(List.empty())
                      )
                    )
                ),
                new Exited(s.nextKey, ex, s.update)
              )
            }
            case "Parallel": {
              return Tp.tuple(
                chain_(
                  forEachPar_(
                    Array.from(s.finalizers()).reverse(),
                    ([_, f]) => exit(s.update(f)(ex)),
                    __trace
                  ),
                  (results) =>
                    done(
                      O.getOrElse_(exitCollectAllPar(results), () =>
                        exitSucceed(List.empty())
                      )
                    )
                ),
                new Exited(s.nextKey, ex, s.update)
              )
            }
            case "ParallelN": {
              return Tp.tuple(
                chain_(
                  forEachParN(
                    Array.from(s.finalizers()).reverse(),
                    execStrategy.n,
                    ([_, f]) => exit(s.update(f)(ex)),
                    __trace
                  ),
                  (results) =>
                    done(
                      O.getOrElse_(exitCollectAllPar(results), () =>
                        exitSucceed(List.empty())
                      )
                    )
                ),
                new Exited(s.nextKey, ex, s.update)
              )
            }
          }
        }
      }
    }),
    flatten
  )
}

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 */
export function managedFork<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, FiberContext<E, A>> {
  return managedApply(
    uninterruptibleMask((status) =>
      pipe(
        Do.do,
        Do.bind("outerReleaseMap", () => fiberRefGet(currentReleaseMap.value)),
        Do.bind("innerReleaseMap", () => releaseMapMake),
        Do.bind("fiber", ({ innerReleaseMap }) =>
          locally_(
            currentReleaseMap.value,
            innerReleaseMap,
            __trace
          )(
            forkDaemon(status.restore(map_(self.effect, (_) => _.get(1)))) as RIO<
              R,
              FiberContext<E, A>
            >
          )
        ),
        Do.bind("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          releaseMapAdd_(
            outerReleaseMap,
            (e) =>
              chain_(interruptFiber(fiber), () =>
                releaseMapReleaseAll_(innerReleaseMap, e, sequential)
              ),
            __trace
          )
        ),
        map(({ fiber, releaseMapEntry }) => Tp.tuple(releaseMapEntry, fiber))
      )
    )
  )
}

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export function managedUse_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => Effect<R2, E2, B>,
  __trace?: string
): Effect<R & R2, E | E2, B> {
  return chain_(releaseMapMake, (releaseMap) =>
    locally_(
      currentReleaseMap.value,
      releaseMap,
      __trace
    )(
      acquireReleaseExitWith_(
        fiberRefGet(currentReleaseMap.value),
        () => chain_(self.effect, (_) => f(_.get(1)), __trace),
        (relMap, ex) => releaseMapReleaseAll_(relMap, ex, sequential, __trace)
      )
    )
  )
}

// -----------------------------------------------------------------------------
// Queue
// -----------------------------------------------------------------------------

export class BackPressureStrategy<A> implements Strategy<A> {
  private putters = new Unbounded<Tp.Tuple<[A, Promise<never, boolean>, boolean]>>()

  handleSurplus(
    as: Chunk.Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean
  ): UIO<boolean> {
    return suspendSucceedWith((_, fiberId) => {
      const p = unsafeMake<never, boolean>(fiberId)

      return onInterrupt_(
        suspendSucceed(() => {
          this.unsafeOffer(as, p)
          this.unsafeOnQueueEmptySpace(queue, takers)
          QCore.unsafeCompleteTakers(this, queue, takers)
          if (isShutdown.get) {
            return interrupt
          } else {
            return promiseAwait(p)
          }
        }),
        () => succeed(() => this.unsafeRemove(p))
      )
    })
  }

  unsafeRemove(p: Promise<never, boolean>) {
    QCore.unsafeOfferAll(
      this.putters,
      ChunkFilter.filter_(QCore.unsafePollAll(this.putters), ([_, __]) => __ !== p)
    )
  }

  unsafeOffer(as: Chunk.Chunk<A>, p: Promise<never, boolean>) {
    let bs = as

    while (Chunk.size(bs) > 0) {
      const head = Chunk.unsafeGet_(bs, 0)!

      bs = Chunk.drop_(bs, 1)

      if (Chunk.size(bs) === 0) {
        this.putters.offer(Tp.tuple(head, p, true))
        return
      } else {
        this.putters.offer(Tp.tuple(head, p, false))
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
            Chunk.prepend_(QCore.unsafePollAll(this.putters), putter)
          )
        }
        QCore.unsafeCompleteTakers(this, queue, takers)
      } else {
        keepPolling = false
      }
    }
  }

  get shutdown(): UIO<void> {
    return pipe(
      Do.do,
      Do.bind("fiberId", () => fiberId),
      Do.bind("putters", () => succeed(() => QCore.unsafePollAll(this.putters))),
      tap((s) =>
        forEachPar_(s.putters, ({ tuple: [_, p, lastItem] }) =>
          lastItem ? interruptAs(s.fiberId)(p) : unit
        )
      ),
      asUnit
    )
  }

  get surplusSize(): number {
    return this.putters.size
  }
}

/**
 * Creates a bounded queue
 */
export function makeBoundedQueue<A>(capacity: number, __trace?: string): UIO<Queue<A>> {
  return chain_(
    succeed(() => new Bounded<A>(capacity)),
    (x) => createQueue_(x, new BackPressureStrategy()),
    __trace
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

  awaitShutdown: UIO<void> = promiseAwait(this.shutdownHook)

  capacity: number = this.queue.capacity

  isShutdown: UIO<boolean> = succeed(() => this.shutdownFlag.get)

  offer(a: A): Effect<unknown, never, boolean> {
    return suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return interrupt
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
          return succeedNow(true)
        }
        const succeeded = this.queue.offer(a)

        QCore.unsafeCompleteTakers(this.strategy, this.queue, this.takers)

        if (succeeded) {
          return succeedNow(true)
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
    return suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return interrupt
      } else {
        const pTakers = this.queue.isEmpty
          ? QCore.unsafePollN(this.takers, Chunk.size(arr))
          : Chunk.empty<Promise<never, A>>()
        const {
          tuple: [forTakers, remaining]
        } = ChunkSplitAt.splitAt_(arr, Chunk.size(pTakers))

        ChunkForEach.forEach_(
          ChunkZip.zip_(pTakers, forTakers),
          ({ tuple: [taker, item] }) => {
            QCore.unsafeCompletePromise(taker, item)
          }
        )

        if (Chunk.size(remaining) === 0) {
          return succeedNow(true)
        }

        const surplus = QCore.unsafeOfferAll(this.queue, remaining)

        QCore.unsafeCompleteTakers(this.strategy, this.queue, this.takers)

        if (Chunk.size(surplus) === 0) {
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

  shutdown: UIO<void> = uninterruptible(
    suspendSucceedWith((_, fiberId) => {
      this.shutdownFlag.set(true)

      return whenEffect(succeed_1<void>(undefined)(this.shutdownHook))(
        chain_(
          forEachPar_(QCore.unsafePollAll(this.takers), interruptAs(fiberId)),
          () => this.strategy.shutdown
        )
      )
    })
  )

  size: UIO<number> = suspendSucceed(() => {
    if (this.shutdownFlag.get) {
      return interrupt
    } else {
      return succeedNow(this.queue.size - this.takers.size + this.strategy.surplusSize)
    }
  })

  take: Effect<unknown, never, A> = suspendSucceedWith((_, fiberId) => {
    if (this.shutdownFlag.get) {
      return interrupt
    }

    const item = this.queue.poll(undefined)

    if (item) {
      this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
      return succeedNow(item)
    } else {
      const p = unsafeMake<never, A>(fiberId)

      return onInterrupt_(
        suspendSucceed(() => {
          this.takers.offer(p)
          QCore.unsafeCompleteTakers(this.strategy, this.queue, this.takers)
          if (this.shutdownFlag.get) {
            return interrupt
          } else {
            return promiseAwait(p)
          }
        }),
        () => succeed(() => QCore.unsafeRemove(this.takers, p))
      )
    }
  })

  takeAll: Effect<unknown, never, Chunk.Chunk<A>> = suspendSucceed(() => {
    if (this.shutdownFlag.get) {
      return interrupt
    } else {
      return succeed(() => {
        const as = QCore.unsafePollAll(this.queue)
        this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
        return as
      })
    }
  })

  takeUpTo(n: number): Effect<unknown, never, Chunk.Chunk<A>> {
    return suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return interrupt
      } else {
        return succeed(() => {
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
  __trace?: string
) {
  return map_(
    make<never, void>(),
    (p) =>
      unsafeCreateQueue(queue, new Unbounded(), p, new AtomicBoolean(false), strategy),
    __trace
  )
}

/**
 * Creates a queue
 *
 * @ets_data_first createQueue_
 */
export function createQueue<A>(strategy: Strategy<A>, __trace?: string) {
  return (queue: MutableQueue<A>) => createQueue_(queue, strategy, __trace)
}
