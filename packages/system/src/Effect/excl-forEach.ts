// ets_tracing: off

import * as cause from "../Cause/index.js"
import * as ChunkCollect from "../Collections/Immutable/Chunk/api/collect.js"
import * as ChunkFilter from "../Collections/Immutable/Chunk/api/filter.js"
import * as ChunkForEach from "../Collections/Immutable/Chunk/api/forEach.js"
import * as ChunkIndexWhere from "../Collections/Immutable/Chunk/api/indexWhere.js"
import * as ChunkSplitAt from "../Collections/Immutable/Chunk/api/splitAt.js"
import * as ChunkZip from "../Collections/Immutable/Chunk/api/zip.js"
import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import * as L from "../Collections/Immutable/List/core.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { Exit } from "../Exit/index.js"
import * as Ex from "../Exit/index.js"
import type { FiberContext } from "../Fiber/context.js"
import type * as Fiber from "../Fiber/core.js"
import { interrupt as fiberInterrupt } from "../Fiber/interrupt.js"
import { identity, pipe } from "../Function/index.js"
import * as I from "../Iterable/index.js"
import type { Managed } from "../Managed/managed.js"
import { managedApply } from "../Managed/managed.js"
import { add } from "../Managed/ReleaseMap/add.js"
import { Exited } from "../Managed/ReleaseMap/Exited.js"
import type { ReleaseMap, State } from "../Managed/ReleaseMap/index.js"
import { makeReleaseMap } from "../Managed/ReleaseMap/makeReleaseMap.js"
import * as O from "../Option/index.js"
import type { Promise } from "../Promise/index.js"
import * as Q from "../Queue/core.js"
import { XQueueInternal } from "../Queue/xqueue.js"
import { AtomicBoolean } from "../Support/AtomicBoolean/index.js"
import type { MutableQueue } from "../Support/MutableQueue/index.js"
import { Bounded, EmptyQueue, Unbounded } from "../Support/MutableQueue/index.js"
import * as asUnit from "./asUnit.js"
import * as bracket from "./bracket.js"
import { bracketExit_ } from "./bracketExit.js"
import * as catchAll from "./catchAll.js"
import * as core from "./core.js"
import * as coreScope from "./core-scope.js"
import * as Do from "./do.js"
import { done } from "./done.js"
import type { Effect, UIO } from "./effect.js"
import * as ensuring from "./ensuring.js"
import { environment } from "./environment.js"
import * as Ref from "./excl-deps-ref.js"
import * as promise from "./excl-forEach-promise.js"
import type { ExecutionStrategy } from "./ExecutionStrategy.js"
import { sequential } from "./ExecutionStrategy.js"
import * as fiberId from "./fiberId.js"
import * as flatten from "./flatten.js"
import * as ifM from "./ifM.js"
import * as interruption from "./interruption.js"
import * as map from "./map.js"
import { provideSome_ } from "./provideSome.js"
import * as tap from "./tap.js"
import * as tapCause from "./tapCause.js"
import { toManaged } from "./toManaged.js"
import * as whenM from "./whenM.js"
import * as zips from "./zips.js"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 */
export function forEach_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return core.suspend(() => {
    const acc: B[] = []

    return map.map_(
      forEachUnit_(as, (a) =>
        map.map_(f(a), (b) => {
          acc.push(b)
        })
      ),
      () => Chunk.from(acc)
    )
  }, __trace)
}

/**
 * Same as `forEach_`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 */
export function forEachWithIndex_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return core.suspend(() => {
    let index = 0
    const acc: B[] = []

    return map.map_(
      forEachUnit_(as, (a) =>
        map.map_(f(a, index), (b) => {
          acc.push(b)
          index++
        })
      ),
      () => Chunk.from(acc)
    )
  }, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 *
 * @ets_data_first forEach_
 */
export function forEach<A, R, E, B>(f: (a: A) => Effect<R, E, B>, __trace?: string) {
  return (as: Iterable<A>) => forEach_(as, f, __trace)
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

function forEachUnitLoop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, E, void> {
  const next = iterator.next()
  return next.done
    ? core.unit
    : core.chain_(f(next.value), () => forEachUnitLoop(iterator, f))
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 */
export function forEachUnit_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  return core.suspend(() => forEachUnitLoop(as[Symbol.iterator](), f), __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @ets_data_first forEachUnit_
 */
export function forEachUnit<R, E, A, X>(
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): (as: Iterable<A>) => Effect<R, E, void> {
  return (as) => forEachUnit_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 */
export function forEachUnitPar_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  const collection = L.from(as)
  const size = L.size(collection)
  if (L.isEmpty(collection)) {
    return core.unit
  }
  return core.suspend(
    () =>
      pipe(
        Do.do,
        Do.bind("parentId", () => fiberId.fiberId),
        Do.bind("causes", () => Ref.makeRef<cause.Cause<E>>(cause.empty)),
        Do.bind("result", () => promise.make<void, void>()),
        Do.bind("status", () =>
          Ref.makeRef(Tp.tuple<[number, number, boolean]>(0, 0, false))
        ),
        Do.let("startTask", ({ status }) =>
          pipe(
            status,
            Ref.modify(({ tuple: [started, done, failing] }) => {
              if (failing) {
                return Tp.tuple(false, Tp.tuple(started, done, failing))
              }
              return Tp.tuple(true, Tp.tuple(started + 1, done, failing))
            })
          )
        ),
        Do.let("startFailure", ({ result, status }) =>
          pipe(
            status,
            Ref.update(({ tuple: [started, done, _] }) =>
              Tp.tuple(started, done, true)
            ),
            zips.zipRight(promise.fail<void>(undefined)(result))
          )
        ),
        Do.let(
          "task",
          ({ causes, parentId, result, startFailure, startTask, status }) =>
            (a: A) =>
              pipe(
                ifM.ifM_(
                  startTask,
                  () =>
                    pipe(
                      core.suspend(() => f(a)),
                      interruption.interruptible,
                      tapCause.tapCause((c) =>
                        pipe(
                          causes,
                          Ref.update((_) => cause.combinePar(_, c)),
                          zips.zipRight(startFailure)
                        )
                      ),
                      ensuring.ensuring(
                        (() => {
                          const isComplete = pipe(
                            status,
                            Ref.modify(({ tuple: [started, done, failing] }) => {
                              const newDone = done + 1

                              return Tp.tuple(
                                (failing ? started : size) === newDone,
                                Tp.tuple(started, newDone, failing)
                              )
                            })
                          )

                          return pipe(
                            promise.succeed<void>(undefined)(result),
                            whenM.whenM(isComplete)
                          )
                        })()
                      )
                    ),
                  () =>
                    pipe(
                      causes,
                      Ref.update((_) => cause.combinePar(_, cause.interrupt(parentId)))
                    )
                ),
                interruption.uninterruptible
              )
        ),
        Do.bind("fibers", ({ task }) =>
          coreScope.transplant((graft) =>
            forEach_(collection, (a) => core.fork(graft(task(a))))
          )
        ),
        Do.let("interrupter", ({ fibers, parentId, result }) =>
          pipe(
            result,
            promise.await,
            catchAll.catchAll(() =>
              pipe(
                forEach_(fibers, (_) => core.fork(_.interruptAs(parentId))),
                core.chain(fiberJoinAll)
              )
            ),
            forkManaged
          )
        ),
        tap.tap(({ causes, fibers, interrupter, result }) =>
          managedUse_(interrupter, () =>
            pipe(
              result,
              promise.fail<void>(undefined),
              zips.zipRight(pipe(causes.get, core.chain(core.halt))),
              whenM.whenM(
                pipe(
                  forEach_(fibers, (_) => _.await),
                  map.map(
                    (_) =>
                      ChunkIndexWhere.indexWhere_(_, (ex) => !Ex.succeeded(ex)) !== -1
                  )
                )
              )
            )
          )
        ),
        tap.tap(({ fibers }) => forEach_(fibers, (_) => _.inheritRefs)),
        asUnit.asUnit
      ),
    __trace
  )
}

/**
 * Forks the fiber in a `Managed`. Using the `Managed` value will
 * execute the effect in the fiber, while ensuring its interruption when
 * the effect supplied to `use` completes.
 */
export function forkManaged<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Managed<R, never, FiberContext<E, A>> {
  return managedFork(toManaged(self), __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 *
 * @ets_data_first forEachUnitPar_
 */
export function forEachUnitPar<R, E, A, X>(
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachUnitPar_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return core.suspend(
    () =>
      core.chain_(
        core.succeedWith<B[]>(() => []),
        (array) =>
          map.map_(
            forEachUnitPar_(
              I.map_(as, (a, n) => [a, n] as [A, number]),
              ([a, n]) =>
                core.chain_(
                  core.suspend(() => f(a)),
                  (b) =>
                    core.succeedWith(() => {
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
 * Same as `forEachPar_`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 */
export function forEachParWithIndex_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return core.suspend(
    () =>
      core.chain_(
        core.succeedWith<B[]>(() => []),
        (array) =>
          map.map_(
            forEachUnitPar_(
              I.map_(as, (a, n) => [a, n] as [A, number]),
              ([a, n]) =>
                core.chain_(
                  core.suspend(() => f(a, n)),
                  (b) =>
                    core.succeedWith(() => {
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
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets_data_first forEachPar_
 */
export function forEachPar<R, E, A, B>(f: (a: A) => Effect<R, E, B>, __trace?: string) {
  return (as: Iterable<A>): Effect<R, E, Chunk.Chunk<B>> => forEachPar_(as, f, __trace)
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

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `forEachUnitPar_`, this method will use at most up to `n` fibers.
 */
export function forEachUnitParN_<R, E, A, X>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  const as_ = L.from(as)
  const size = L.size(as_)

  function worker(q: Q.Queue<A>, ref: Ref.Ref<number>): Effect<R, E, void> {
    return pipe(
      Q.take(q),
      core.chain(f),
      core.chain(() => worker(q, ref)),
      whenM.whenM(
        pipe(
          ref,
          Ref.modify((n) => Tp.tuple(n > 0, n - 1))
        )
      )
    )
  }

  return core.suspend(
    () =>
      pipe(
        makeBoundedQueue<A>(n),
        bracket.bracket(
          (q) =>
            pipe(
              Do.do,
              Do.bind("ref", () => Ref.makeRef(size)),
              tap.tap(() => core.fork(forEachUnit_(as, (x) => Q.offer_(q, x)))),
              Do.bind("fibers", ({ ref }) =>
                collectAll(L.map_(L.range_(0, n), () => core.fork(worker(q, ref))))
              ),
              tap.tap(({ fibers }) => forEach_(fibers, (_) => _.await))
            ),
          (q) => Q.shutdown(q)
        )
      ),
    __trace
  )
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `forEachUnitPar_`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first forEachUnitParN_
 */
export function forEachUnitParN<R, E, A, X>(
  n: number,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachUnitParN_(as, n, f, __trace)
}

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `forEachPar`, this method will use at most up to `n` fibers.
 */
export function forEachParN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  function worker(
    q: Q.Queue<Tp.Tuple<[promise.Promise<E, B>, A]>>,
    pairs: Iterable<Tp.Tuple<[promise.Promise<E, B>, A]>>,
    ref: Ref.Ref<number>
  ): Effect<R, never, void> {
    return pipe(
      Q.take(q),
      core.chain(({ tuple: [p, a] }) =>
        pipe(
          core.suspend(() => f(a)),
          core.foldCauseM(
            (c) => forEach_(pairs, (_) => pipe(_.get(0), promise.halt(c))),
            (b) => pipe(p, promise.succeed(b))
          )
        )
      ),
      core.chain(() => worker(q, pairs, ref)),
      whenM.whenM(
        pipe(
          ref,
          Ref.modify((n) => Tp.tuple(n > 0, n - 1))
        )
      )
    )
  }

  return core.suspend(
    () =>
      pipe(
        makeBoundedQueue<Tp.Tuple<[promise.Promise<E, B>, A]>>(n),
        bracket.bracket(
          (q) =>
            pipe(
              Do.do,
              Do.bind("pairs", () =>
                forEach_(as, (a) =>
                  pipe(
                    promise.make<E, B>(),
                    map.map((p) => Tp.tuple(p, a))
                  )
                )
              ),
              Do.bind("ref", ({ pairs }) => Ref.makeRef(Chunk.size(pairs))),
              tap.tap(({ pairs }) =>
                core.fork(forEach_(pairs, (pair) => Q.offer_(q, pair)))
              ),
              tap.tap(({ pairs, ref }) =>
                collectAllUnit(
                  pipe(
                    L.range_(0, n),
                    L.map(() => core.fork(worker(q, pairs, ref)))
                  )
                )
              ),
              core.chain(({ pairs }) => forEach_(pairs, (_) => promise.await(_.get(0))))
            ),
          Q.shutdown
        )
      ),
    __trace
  )
}

/**
 * Same as `forEachParN_`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 */
export function forEachParWithIndexN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A, i: number) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  function worker(
    q: Q.Queue<Tp.Tuple<[promise.Promise<E, B>, A, number]>>,
    pairs: Iterable<Tp.Tuple<[promise.Promise<E, B>, A, number]>>,
    ref: Ref.Ref<number>
  ): Effect<R, never, void> {
    return pipe(
      Q.take(q),
      core.chain(({ tuple: [p, a, i] }) =>
        pipe(
          core.suspend(() => f(a, i)),
          core.foldCauseM(
            (c) => forEach_(pairs, (_) => pipe(_.get(0), promise.halt(c))),
            (b) => pipe(p, promise.succeed(b))
          )
        )
      ),
      core.chain(() => worker(q, pairs, ref)),
      whenM.whenM(
        pipe(
          ref,
          Ref.modify((n) => Tp.tuple(n > 0, n - 1))
        )
      )
    )
  }

  return core.suspend(
    () =>
      pipe(
        makeBoundedQueue<Tp.Tuple<[promise.Promise<E, B>, A, number]>>(n),
        bracket.bracket(
          (q) =>
            pipe(
              Do.do,
              Do.bind("pairs", () =>
                forEachWithIndex_(as, (a, i) =>
                  pipe(
                    promise.make<E, B>(),
                    map.map((p) => Tp.tuple(p, a, i))
                  )
                )
              ),
              Do.bind("ref", ({ pairs }) => Ref.makeRef(Chunk.size(pairs))),
              tap.tap(({ pairs }) =>
                core.fork(forEach_(pairs, (pair) => Q.offer_(q, pair)))
              ),
              tap.tap(({ pairs, ref }) =>
                collectAllUnit(
                  pipe(
                    L.range_(0, n),
                    L.map(() => core.fork(worker(q, pairs, ref)))
                  )
                )
              ),
              core.chain(({ pairs }) => forEach_(pairs, (_) => promise.await(_.get(0))))
            ),
          Q.shutdown
        )
      ),
    __trace
  )
}

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `forEachPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first forEachParN_
 */
export function forEachParN<R, E, A, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachParN_(as, n, f, __trace)
}

/**
 * Same as `forEachParN`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @ets_data_first forEachParWithIndexN_
 */
export function forEachParWithIndexN<R, E, A, B>(
  n: number,
  f: (a: A, i: number) => Effect<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachParWithIndexN_(as, n, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 */
export function forEachExec_<R, E, A, B>(
  as: Iterable<A>,
  es: ExecutionStrategy,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  switch (es._tag) {
    case "Sequential": {
      return forEach_(as, f, __trace) as any
    }
    case "Parallel": {
      return forEachPar_(as, f, __trace) as any
    }
    case "ParallelN": {
      return forEachParN_(as, es.n, f, __trace) as any
    }
  }
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets_data_first forEachExec_
 */
export function forEachExec<R, E, A, B>(
  es: ExecutionStrategy,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): (as: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (as) => forEachExec_(as, es, f, __trace)
}

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export function collectAll<R, E, A>(as: Iterable<Effect<R, E, A>>, __trace?: string) {
  return forEach_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 */
export function collectAllPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return forEachPar_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 *
 * @ets_data_first collectAllParN_
 */
export function collectAllParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    forEachParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 */
export function collectAllParN_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  __trace?: string
) {
  return forEachParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export function collectAllUnit<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return forEachUnit_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 */
export function collectAllUnitPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return forEachUnitPar_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 *
 * @ets_data_first collectAllUnitParN_
 */
export function collectAllUnitParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    forEachUnitParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 */
export function collectAllUnitParN_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  __trace?: string
) {
  return forEachUnitParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return map.map_(collectAll(as, __trace), ChunkCollect.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>) => collectAllWith_(as, pf, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWithPar_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return map.map_(collectAllPar(as, __trace), ChunkCollect.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWithPar_
 */
export function collectAllWithPar<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>) => collectAllWithPar_(as, pf, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * Unlike `collectAllWithPar`, this method will use at most up to `n` fibers.
 */
export function collectAllWithParN_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return map.map_(collectAllParN_(as, n, __trace), ChunkCollect.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * Unlike `collectAllWithPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first collectAllWithParN_
 */
export function collectAllWithParN<A, B>(
  n: number,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): <R, E>(as: Iterable<Effect<R, E, A>>) => Effect<R, E, Chunk.Chunk<B>> {
  return (as) => collectAllWithParN_(as, n, pf, __trace)
}

/**
 * Evaluate and run each effect in the structure and collect discarding failed ones.
 */
export function collectAllSuccesses<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return collectAllWith_(
    I.map_(as, (x) => core.result(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 */
export function collectAllSuccessesPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return collectAllWithPar_(
    I.map_(as, (x) => core.result(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * Unlike `collectAllSuccessesPar`, this method will use at most up to `n` fibers.
 */
export function collectAllSuccessesParN_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  __trace?: string
) {
  return collectAllWithParN_(
    I.map_(as, (x) => core.result(x)),
    n,
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * Unlike `collectAllSuccessesPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first collectAllSuccessesParN_
 */
export function collectAllSuccessesParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    collectAllSuccessesParN_(as, n, __trace)
}

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export function fiberJoinAll<E, A>(as: Iterable<Fiber.Fiber<E, A>>, __trace?: string) {
  return tap.tap_(
    core.chain_(fiberWaitAll(as), done),
    () => forEach_(as, (f) => f.inheritRefs),
    __trace
  )
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function fiberWaitAll<E, A>(as: Iterable<Fiber.Fiber<E, A>>, __trace?: string) {
  return core.result(
    forEachPar_(as, (f) => core.chain_(f.await, done)),
    __trace
  )
}

/**
 * Releases all the finalizers in the releaseMap according to the ExecutionStrategy
 */
export function releaseMapReleaseAll(
  exit: Exit<any, any>,
  execStrategy: ExecutionStrategy,
  __trace?: string
): (_: ReleaseMap) => UIO<any> {
  return (_: ReleaseMap) =>
    pipe(
      _.ref,
      Ref.modify((s): Tp.Tuple<[UIO<any>, State]> => {
        switch (s._tag) {
          case "Exited": {
            return Tp.tuple(core.unit, s)
          }
          case "Running": {
            switch (execStrategy._tag) {
              case "Sequential": {
                return Tp.tuple(
                  core.chain_(
                    forEach_(
                      Array.from(s.finalizers()).reverse(),
                      ([_, f]) => core.result(f(exit)),
                      __trace
                    ),
                    (e) => done(O.getOrElse_(Ex.collectAll(...e), () => Ex.succeed([])))
                  ),
                  new Exited(s.nextKey, exit)
                )
              }
              case "Parallel": {
                return Tp.tuple(
                  core.chain_(
                    forEachPar_(
                      Array.from(s.finalizers()).reverse(),
                      ([_, f]) => core.result(f(exit)),
                      __trace
                    ),
                    (e) =>
                      done(O.getOrElse_(Ex.collectAllPar(...e), () => Ex.succeed([])))
                  ),
                  new Exited(s.nextKey, exit)
                )
              }
              case "ParallelN": {
                return Tp.tuple(
                  core.chain_(
                    forEachParN_(
                      Array.from(s.finalizers()).reverse(),
                      execStrategy.n,
                      ([_, f]) => core.result(f(exit)),
                      __trace
                    ),
                    (e) =>
                      done(O.getOrElse_(Ex.collectAllPar(...e), () => Ex.succeed([])))
                  ),
                  new Exited(s.nextKey, exit)
                )
              }
            }
          }
        }
      }),
      flatten.flatten
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
    interruption.uninterruptibleMask(({ restore }) =>
      pipe(
        Do.do,
        Do.bind("tp", () => environment<Tp.Tuple<[R, ReleaseMap]>>()),
        Do.let("r", ({ tp }) => tp.get(0)),
        Do.let("outerReleaseMap", ({ tp }) => tp.get(1)),
        Do.bind("innerReleaseMap", () => makeReleaseMap),
        Do.bind("fiber", ({ innerReleaseMap, r }) =>
          restore(
            pipe(
              self.effect,
              map.map((_) => _.get(1)),
              coreScope.forkDaemon,
              core.provideAll(Tp.tuple(r, innerReleaseMap), __trace)
            )
          )
        ),
        Do.bind("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          add((e) =>
            pipe(
              fiber,
              fiberInterrupt,
              core.chain(
                () => releaseMapReleaseAll(e, sequential)(innerReleaseMap),
                __trace
              )
            )
          )(outerReleaseMap)
        ),
        map.map(({ fiber, releaseMapEntry }) => Tp.tuple(releaseMapEntry, fiber))
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
  return bracketExit_(
    makeReleaseMap,
    (rm) =>
      core.chain_(
        provideSome_(self.effect, (r: R) => Tp.tuple(r, rm)),
        (a) => f(a.get(1)),
        __trace
      ),
    (rm, ex) => releaseMapReleaseAll(ex, sequential, __trace)(rm)
  )
}

export class BackPressureStrategy<A> implements Q.Strategy<A> {
  private putters = new Unbounded<Tp.Tuple<[A, Promise<never, boolean>, boolean]>>()

  handleSurplus(
    as: Chunk.Chunk<A>,
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean
  ): UIO<boolean> {
    return core.suspend((_, fiberId) => {
      const p = promise.unsafeMake<never, boolean>(fiberId)

      return interruption.onInterrupt_(
        core.suspend(() => {
          this.unsafeOffer(as, p)
          this.unsafeOnQueueEmptySpace(queue, takers)
          Q.unsafeCompleteTakers(this, queue, takers)
          if (isShutdown.get) {
            return interruption.interrupt
          } else {
            return promise.await(p)
          }
        }),
        () => core.succeedWith(() => this.unsafeRemove(p))
      )
    })
  }

  unsafeRemove(p: Promise<never, boolean>) {
    Q.unsafeOfferAll(
      this.putters,
      ChunkFilter.filter_(Q.unsafePollAll(this.putters), ([_, __]) => __ !== p)
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
      const putter = this.putters.poll(EmptyQueue)

      if (putter !== EmptyQueue) {
        const offered = queue.offer(putter.get(0))

        if (offered && putter.get(2)) {
          Q.unsafeCompletePromise(putter.get(1), true)
        } else if (!offered) {
          Q.unsafeOfferAll(
            this.putters,
            Chunk.prepend_(Q.unsafePollAll(this.putters), putter)
          )
        }
        Q.unsafeCompleteTakers(this, queue, takers)
      } else {
        keepPolling = false
      }
    }
  }

  get shutdown(): UIO<void> {
    return pipe(
      Do.do,
      Do.bind("fiberId", () => fiberId.fiberId),
      Do.bind("putters", () => core.succeedWith(() => Q.unsafePollAll(this.putters))),
      tap.tap((s) =>
        forEachPar_(s.putters, ({ tuple: [_, p, lastItem] }) =>
          lastItem ? promise.interruptAs(s.fiberId)(p) : core.unit
        )
      ),
      asUnit.asUnit
    )
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
  __trace?: string
): UIO<Q.Queue<A>> {
  return core.chain_(
    core.succeedWith(() => new Bounded<A>(capacity)),
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
  strategy: Q.Strategy<A>
): Q.Queue<A> {
  return new UnsafeCreate(queue, takers, shutdownHook, shutdownFlag, strategy)
}

class UnsafeCreate<A> extends XQueueInternal<unknown, unknown, never, never, A, A> {
  constructor(
    readonly queue: MutableQueue<A>,
    readonly takers: MutableQueue<Promise<never, A>>,
    readonly shutdownHook: Promise<never, void>,
    readonly shutdownFlag: AtomicBoolean,
    readonly strategy: Q.Strategy<A>
  ) {
    super()
  }

  awaitShutdown: UIO<void> = promise.await(this.shutdownHook)

  capacity: number = this.queue.capacity

  isShutdown: UIO<boolean> = core.succeedWith(() => this.shutdownFlag.get)

  offer(a: A): Effect<unknown, never, boolean> {
    return core.suspend(() => {
      if (this.shutdownFlag.get) {
        return interruption.interrupt
      } else {
        const noRemaining = (() => {
          if (this.queue.isEmpty) {
            const taker = this.takers.poll(EmptyQueue)

            if (taker === EmptyQueue) {
              return false
            } else {
              Q.unsafeCompletePromise(taker, a)
              return true
            }
          } else {
            return false
          }
        })()

        if (noRemaining) {
          return core.succeed(true)
        }
        const succeeded = this.queue.offer(a)

        Q.unsafeCompleteTakers(this.strategy, this.queue, this.takers)

        if (succeeded) {
          return core.succeed(true)
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
    return core.suspend(() => {
      if (this.shutdownFlag.get) {
        return interruption.interrupt
      } else {
        const pTakers = this.queue.isEmpty
          ? Q.unsafePollN(this.takers, Chunk.size(arr))
          : Chunk.empty<Promise<never, A>>()
        const {
          tuple: [forTakers, remaining]
        } = ChunkSplitAt.splitAt_(arr, Chunk.size(pTakers))

        ChunkForEach.forEach_(
          ChunkZip.zip_(pTakers, forTakers),
          ({ tuple: [taker, item] }) => {
            Q.unsafeCompletePromise(taker, item)
          }
        )

        if (Chunk.size(remaining) === 0) {
          return core.succeed(true)
        }

        const surplus = Q.unsafeOfferAll(this.queue, remaining)

        Q.unsafeCompleteTakers(this.strategy, this.queue, this.takers)

        if (Chunk.size(surplus) === 0) {
          return core.succeed(true)
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

  shutdown: UIO<void> = interruption.uninterruptible(
    core.suspend((_, fiberId) => {
      this.shutdownFlag.set(true)

      return whenM.whenM(promise.succeed<void>(undefined)(this.shutdownHook))(
        core.chain_(
          forEachPar_(Q.unsafePollAll(this.takers), promise.interruptAs(fiberId)),
          () => this.strategy.shutdown
        )
      )
    })
  )

  size: UIO<number> = core.suspend(() => {
    if (this.shutdownFlag.get) {
      return interruption.interrupt
    } else {
      return core.succeed(
        this.queue.size - this.takers.size + this.strategy.surplusSize
      )
    }
  })

  take: Effect<unknown, never, A> = core.suspend((_, fiberId) => {
    if (this.shutdownFlag.get) {
      return interruption.interrupt
    }

    const item = this.queue.poll(EmptyQueue)

    if (item !== EmptyQueue) {
      this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
      return core.succeed(item)
    } else {
      const p = promise.unsafeMake<never, A>(fiberId)

      return interruption.onInterrupt_(
        core.suspend(() => {
          this.takers.offer(p)
          Q.unsafeCompleteTakers(this.strategy, this.queue, this.takers)
          if (this.shutdownFlag.get) {
            return interruption.interrupt
          } else {
            return promise.await(p)
          }
        }),
        () => core.succeedWith(() => Q.unsafeRemove(this.takers, p))
      )
    }
  })

  takeAll: Effect<unknown, never, Chunk.Chunk<A>> = core.suspend(() => {
    if (this.shutdownFlag.get) {
      return interruption.interrupt
    } else {
      return core.succeedWith(() => {
        const as = Q.unsafePollAll(this.queue)
        this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
        return as
      })
    }
  })

  takeUpTo(n: number): Effect<unknown, never, Chunk.Chunk<A>> {
    return core.suspend(() => {
      if (this.shutdownFlag.get) {
        return interruption.interrupt
      } else {
        return core.succeedWith(() => {
          const as = Q.unsafePollN(this.queue, n)
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
  strategy: Q.Strategy<A>,
  __trace?: string
) {
  return map.map_(
    promise.make<never, void>(),
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
export function createQueue<A>(strategy: Q.Strategy<A>, __trace?: string) {
  return (queue: MutableQueue<A>) => createQueue_(queue, strategy, __trace)
}
